# Concurrency and Other Async Node Patterns

Most of us learned programming in a synchronous manner and never bothered with asynchronous patterns. Well, you might start learning async now, because asynchronous code is more efficient than synchronous, but to write good async code you need to know at least a few Node patterns.

This lesson will cover the concurrency and error handling patterns:

1. Learn async error handling instead of try/catch
1. Demonstrate concurrency with async for-loop

## Sync Error Handling

In traditional synchronous code, you would `throw` an error and catch it later up in the call stack... or not catch it (if you just writing a class, whatever uses it will need to catch the error). This is an illustration:

```js
var badJson = '{a: "1"}'
try {
  var obj = JSON.parse(badJson)
} catch (error) {
  console.error(error)
}
```  

If you run this code, you'll see "[SyntaxError: Unexpected token a]" because `badJson` is a bad JSON object (no double quotes around property name `a`). The script didn't crash. `try/catch` save it. If you had this snippet in a large application, the app would continue to work just fine albeit without the parsed object.

For this reason, in synchronous code you can `throw` an error as long as you have `try/catch` to handle it:

```js
try {
  throw new Error('BOOM!')
} catch (error) {
  console.error(error)
}
```

Now, create a file `async-throw.js` and type the code which has `throw` inside of the asynchronous callback:

```js
try {
  setTimeout(function(){  throw new Error('BOOM!')}, 0)
} catch (error) {
  console.error(error)
}
```

The script will crash. This is what you will see:

```
KA...
/Users/azat/Documents/Code/learn-co/node-patterns-concurrency/async-throw.js:2
  setTimeout(function(){  throw new Error('BOOM!')}, 0)
                          ^

Error: BOOM!
    at null._onTimeout (/Users/azat/Documents/Code/learn-co/node-patterns-concurrency/async-throw.js:2:33)
    at Timer.listOnTimeout (timers.js:92:15)
```

This is how I feel when I try to catch asynchronous errors (and fail miserably):

![](baby_elephant.gif)

Note: When you `setTimeout` with 0, it will schedule the callback at 0 milliseconds, but on the next tick (same as iteration or cycle) of the event loop. For this reason, Node will finish with all the statements in this file first and only after that on the next cycle, it will fire up the callback.


The "KA..." message is shown first, then the delayed callback throws an error which kills the program. When we don't have asynchronous code, `try/catch` works. However, with asynchronous code `try/catch` is useless unless you put it inside of the callback. Why is that?

If we go deeper under the hood, callbacks are scheduled by the event loop. They lose context of the  environment in which they were defined (and lose `try/catch` which is around them). In a way, future code (callbacks) and current code (`try/catch`) become separated by the Node's non-blocking I/O and event loop mechanisms. 

What should we do?

## Async Error Handling

Node developers use error-as-the-first-argument pattern to bubble up the errors. When you have an error which comes from an asynchronous code, check for it. Always check for these errors and pass them up the chain. 

Consider this code in which we have a `callback` function and use it to pass either `null` or `error`:

```js
module.exports = function(inputFile, customers, callback){
  return function writeFile(error){
    if (!error) {
      return callback(null, customers)
    } else {
      return callback(error)
    }
  }
}
```

The same code can be refactored into more compact version:

```js
module.exports = function(inputFile, customers, callback){
  return function writeFile(error){
    if (error) return callback(error)
    return callback(null, customers)
  }
}
```

By using `if (error) return callback(error)` you will NOT increase the indentation which leads to callback hell. As you know, `return` will stop the execution and return the value making this function an expression. We don't really care about it being the expression. We use `return` to control the flow.

If you don't have an error (it's falsy), just continue with your logic. At some point, you might want to return some data back to the original caller via the callback. Pass the data as the second argument, leaving the first for the error which is `null` if everything went fine.

Because of the way closures work in JavaScript/Node (they have access to outer scope), you can invoke `callback` at any level when you have multiple levels of nested callbacks (file `file-read.js`):

```js
var fs = require('fs')
var inputFile = './customers.csv'

function getCustomers (callback){
  fs.stat(inputFile, function(error, stats){
    if (stats.isFile()) {
      fs.readFile(inputFile, 'utf8', function(error, customersCSV){
        if (error) return callback(error)
        customers = customersCSV.split('\n').map(function(customerLine){
          customerArray = customerLine.split(',')
          return {
          id: customerArray[0],
          first_name: customerArray[1]
        }})
        console.log(customers);
        customersJSON = JSON.stringify(customers, 0, 4)
        fs.writeFile('./customers.json', customersJSON, 'utf-8', function(error){
          if (error) return callback(error)
          return callback(null, customersJSON)
        })
      })
    } else {
      console.error('The input CSV file is not found')
    }
  })
}


console.log(getCustomers(console.log));

module.exports = getCustomers
```

When using an object which implement Event Emitters, listen to `error` event with `on('error', callback)`. Similarly, when you implement your own object with events, trigger error with `emit('error', error)`. As you remember, you can pass any data with `emit()`.

When all hell breaks lose, listen to `process.on('uncaughtException', callback)`. Think about it as the last resort. Don't try to resume the execution at this point. There might be some lost states. Just log and exit gracefully. 

## `okay`

There's also a nice little module (as they are should be in npm) which will do the repetitive work of checking for errors for you. To install it, simply run `npm i ok -S`.

Then, use it like this in your callbacks (the code is from the above example):

```js
fs.readFile(inputFile, 'utf8', okay(callback, function(customersCSV){
  callback(customersCSV)
}))
```

NO NEED for `if (error) return callback(error)`!!!

The above code which transforms CSV into a JSON file with `okay` will look more compact (`file-read-with-okay.js`):

```js
var fs = require('fs')
var okay = require('okay')
var inputFile = './customers.csv'

function getCustomers (callback){
  fs.stat(inputFile, function(error, stats){
    if (stats.isFile()) {
      fs.readFile(inputFile, 'utf8', okay(callback, function(customersCSV){
        customers = customersCSV.split('\n').map(function(customerLine){
          customerArray = customerLine.split(',')
          return {
          id: customerArray[0],
          first_name: customerArray[1]
        }})
        console.log(customers);
        customersJSON = JSON.stringify(customers, 0, 4)
        fs.writeFile('./customers.json', customersJSON, 'utf-8', okay(callback, function(){
          return callback(null, customersJSON)
        }))
      }))
    } else {
      console.error('The input CSV file is not found')
    }
  })
}

console.log(getCustomers(console.log));

module.exports = getCustomers
```

## Concurrency

Imagine you have 10 requests and your program makes them one by one because the process is blocked each time the program waits for the remote server (which is on the other side of the universe) to respond.  The requests are independent of each other. Why can't speed things up?

Often times we need to process multiple things which are the same. If they are independent of each other, we can run them concurrently by taking advantage of Node's event loop. This is *greeeeaaaatly* reduces the waiting time and increases the smile on developers' faces. 

The most straightforward way to launch concurrent tasks is a for loop (or any other kind of loop like while):

```js
for (var i = 1; i<=10; i++) {
  makeRequest(i, function() {...}) // async, that's why callback
}
```

The program won't make the requests in parallel although it might look like they are running in parallel. The loop will fire up all 10 of them so fast! They'll come back at different times because they are asynchronous and the time for each request will vary. 

So how do we print the results of these 10 requests? We'll need to do it in the callback of each request:

```
for (var i = 1; i<=10; i++) {
  makeRequest(i, function(response) {console.log(response)}) // async, that's why callback
}
```

Now we have another problem: let's say making 10 requests is just one part of our program. We need to move on and continue working on something else, maybe transform the responses. Where do we put the logic? How about after the for loop?

```js
var responses = {}
for (var i = 1; i<=10; i++) {
  makeRequest(i, function(response) {
    console.log(response)
    responses[i] = (response)
  })
}
console.log(responses)
processResponses(responses)
```

It won't work because the response will be defined only in the callback. It's too early to except it right after the for loop. How about moving the next piece of logic into the callback?


```js
var responses = {}
for (var i = 1; i<=10; i++) {
  makeRequest(i, function(response) {
    console.log(response)
    responses[i] = (response)
    processResponses(responses)
  })
}
```

This is much better but not good enough because we want just a single point of continuation, not 10. In other words, `processResponses` must be called just one. It's the continuation of your program. Right now it's called 10 times! No bueno. How about a simple counter? It will work!

```js
var j = 0
var responses = {}
for (var i = 1; i<=10; i++) {
  makeRequest(i, function(response) {
    j++
    console.log(response)
    responses[i] = (response)
    if (j == 10) processResponses(responses)
  })
}
```

In a nutshell, the pattern above allows to execute multiple tasks concurrently and to have one final callback to continue the execution of the program. We also saved the responses in `responses` object with the original indices 

## Resources

The source code is in the repository <https://github.com/azat-co/nc-posts/tree/master/node-patterns-concurrency> and for more reading follow these articles:

1. [Parallel vs Concurrent in Node.js](http://bytearcher.com/articles/parallel-vs-concurrent)
1. [Essential Node.js patterns and snippets](http://blog.mixu.net/2011/02/02/essential-node-js-patterns-and-snippets)
1. [Node.js Design Patterns book](http://amzn.to/21hXxTy)

