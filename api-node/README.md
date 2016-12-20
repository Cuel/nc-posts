# Beautiful APIs in Node

This post is on how to build beautiful APIs in Node.js. Great, and what is an API? The definition says Application Programming Interface, but what does it mean? It could mean on of the few things depending on the context:

* Endpoints of a service service-oriented architecture (SOA)
* Function signature
* Class attribute and methods

The main idea is that an API is a form of a contract between two or more entities (objects, classes, concerns, etc.). Your main goal as a Node engineer is to build beautiful API so that developers who consume your module/class/service won't be cursing and sending you hate IM and mail. The rest of your code can be ugly but the parts which are public (mean for usage by other programs, and developers) need to be conventional, extendable, simple to use and understand, and consistent. 

Let's see how to build beautiful APIs for which you can make sure other developer

## Beautiful Endpoints in Node: Taming the REST Beast

Most likely, you are not using core Node `http` module directly, but a framework like Express or Hapi. If not, then strongly consider using a framework. It will come with freebies like parsing and route organization. I'll be using Express for my examples.

Here's our API server with CRUD for the `/accounts` resource listed with an HTTP method and the URL pattern (`{} means it's a variable):

* GET `/accounts`: Get a list of accounts
* POST `/accounts`: Create a new account
* GET `/accounts/{ID}`: Get one account by ID
* PUT `/accounts/{ID}`: Partial update one account by ID
* DELETE `/accounts/{ID}`: Remove one account by ID

You can notice immediately that we need to send the resource (account) ID in the URL for the last three endpoints. By doing so we achieve the goals of having a clear distinction between resource collection and individual resource. This in turn helps to prevent mistakes from the client side. For example, it's easier to mistake DELETE `/accounts` with ID in the body of the request for the removal of all accounts which can easily get you fired if this bug ever makes it into production and actually causes the deleting of all accounts.

Additional benefits can be derived from caching by URL. If you use or plan to use Varnish, it caches responses and by having `/accounts/{ID}` you will achieve better caching results.
Still not convinced? The let me tell you that Express will just ignore payload (request body) for requests like DELETE so the only way to get that ID is via a URL.

Express is very elegant in defining the endpoints. For the ID which is called a URL parameter, there's a `req.params` object which will be populated with the properties and values as long as you define the URL parameter (or several) in the URL pattern, e.g., with `:id`. 

```js
app.get('/accounts', (req, res, next) => {
  // Query DB for accounts
  res.send(accounts)
})

app.put('/accounts/:id', (req, res, next) => {
  const accountId = req.params.id
  // Query DB to update the account by ID
  res.send('ok')
})
```

Now, a few words about PUT. It's misused a lot because according to the specification PUT is for complete update, i.e., replacement of the whole entity, not the partial update. However, a lot of API even of big and reputable companies use PUT as a partial update. Did I confuse you already? It's just the beginning of the post! Okay, let me illustrate the difference between partial and complete.

If you update with`{a: 1}` an object `{b: 2}`, the result is `{a: 1, b: 2}` when the update is partial and `{a: 1}` when it's a complete replacement.

Back to the endpoints and HTTP methods. A more proper way is to use PATCH for partial updates not PUT. However, PATCH specs is lacking in implementation. Maybe that's the reason why a lot of developers pick PUT as a partial update instead of PATCH. 

Okay, so we are using PUT because it became the new PATCH. So how do we get the actual JSON? There's `body-parser` which can give us a Node/JavaScript object out of a string.

```js
const bodyParser = require('body-parser')
// ...
app.use(bodyParser.json())
app.post('/accounts', (req, res, next) => {
  const data = req.body
  // Validate data
  // Query DB to create an account
  res.send(account._id)
})

app.put('/accounts/:id', (req, res, next) => {
  const accountId = req.params.id
  const data = req.body
  // Validate data
  // Query DB to update the account by ID
  res.send('ok')
})
```

Always, alway, always validate the incoming (and also outgoing) data. There are modules like joi and express-validator to help you sanitize the data elegantly. 

In the snippet above, you might have noticed that I'm sending back the ID of a newly created account. This is the best practice because clients will need to know how to reference the new resource. Another best practice is to send proper HTTP status codes such as 200, 401, 500, etc. They go into categories:

* 20x: All is good 
* 30x: Redirects
* 40x: Client errors
* 50x: Server errors
 
 By providing a valid error message you can help developers on the client side *dramatically*, because they can know if the request failure is their fault (40x) or server fault (500). In the 40x category, you should distinguish at the very least between authorization, poor payload, and not found. 
 
 In Express, status codes are chained before the `send()`. For example, for POST `/accounts`/ we are sending 201 created along with the ID:
 
 ```js
 res.status(201).send(account._id)
 ```
 
The response for PUT and DELETE doesn't have to contain the ID because we know that client knows the ID. They used in the URL after all. It's still a good idea to send back some okay message saying that it all when as requested. The response might be as simple as `{"msg": "ok"}` or as advanced as 

```js
{ 
  "status": "success",
  "affectedCount": 3,
  "affectedIDs": [
   1,
   2, 
   3
  ]
}
```
 
What about query strings? They can be used for additional information such as a search query, filters, API keys, options, etc. I recommend using query string data for GET when you need to pass additional information. For example, this is how you can implement pagination (we don't want to fetch all 1000000 accounts for the page that shows only 10 of them). The variable page is the page number and the variable limit is how many item is needed for a page.
 
```js
app.get('/accounts', (req, res, next) => {
  const {query, page, limit} = req.query
  // Query DB for accounts 
  res.status(200).send(accounts)
})
```

Enough about endpoints, let's see how to work on a lower level with functions.
 
## Beautiful Functions: Embracing the Functional Nature of Node
 
 Node and JavaScript are very (but not completely) functional meaning we can achieve a lot with functions. We can create objects with functions. A general rule is that by keeping functions pure you can avoid future problems. What is a pure function? It's a function which does NOT have side effects. Don't you love smart asses who define one obscure term with another even more obscure one? A side effect is when a function "touches" something outside, typically a state (like a variable or an object). The proper definition is more complex, but if you remember to have function which only modify their argument, you'll better off than majority (with majority only being 51%—and it's my humble guesstimate anyway).
 
This is a beautiful pure function:

```js
let randomNumber = null
const generateRandomNumber = (limit) => {
  let number = null  
  number = Math.round(Math.random()*limit)
  return number
}
randomNumber = generateRandomNumber(7)
console.log(randomNumber)
``` 

This is a very impure function because it's changing `randomNumber` outside of its scope. Accessing `limit` out of scope is an issue too because this introduce additional interdependency (tight coupling):

```js
let randomNumber = null
let limit = 7
const generateRandomNumber = () => {
  randomNumber = Math.floor(Math.random()*limit)
}
generateRandomNumber()
console.log(randomNumber)
```

The second snippet will work alright but only up to a point in the future as long as you can remember about the side effects `limit` and `randomNumber`. 

There are a few things specific to Node and function *only*. They exist because Node is asynchronous and we didn't have the hipster promises or async/await back in 201x when the core of Node was forming and growing rapidly. In short, for async code we need a way to schedule some future code execution. We need to be able to pass a callback. The best approach is to pass it as the last argument. If you have a variable number of argument (let's say a second argument is optional), then still keep the callback as last. You can use arity (`arguments`) to implement it. 

For example, we can re-write our previous function from synchronous execution to asynchronous by using callback as the last argument pattern. I intentionally left `randomNumber = ` but it will be `undefined` since now the value will be in the callback at some point later.

```js
let randomNumber = null
const generateRandomNumber = (limit, callback) => {
  let number = null  
  // Now we are using super slow but super random process, hence it's async
  slowButGoodRandomGenerator(limit, (number) => {
    callback(number)
  })
  // number is null but will be defined later in callback 
}

randomNumber = generateRandomNumber(7, (number)=>{
  console.log(number)
})
// Guess what, randomNumber is undefined, but number in the callback will be defined later
```

The next pattern which is closely related to async code is error handling. Each time we set up a callback, it will be handled by event loop at some future moment. When the callback code is executed we don't have a reference to the original code anymore, only to variable in the scope. Thus, we cannot use `try/catch` and we cannot throw errors like I know some of you love to do in Java and other synchronous languages.

For this reason, to propagate an error from a nested code (function, module, call, etc.), we can just pass it as an argument... to the callback along with the data (`number`). You can check for your custom rules along the way. Use `return` to terminate the further execution of the code once an error is found. While using `null` as an error value when no errors are present (inherited or custom).

```js
const generateRandomNumber = (limit, callback) => {
  if (!limit) return callback(new Error('Limit not provided'))
  slowButGoodRandomGenerator(limit, (error, number) => {
    if (number > limit) {
      callback(new Error('Oooops, something went wrong. Number is higher than the limit. Check slow function.'), null)
    } else {    
      if (error) return callback(error, number)
      return callback(null, number)
    }
  })
}

generateRandomNumber(7, (error, number) => {
  if (error) {
    console.error(error)
  } else {
    console.log(number)
  }
})
```

Once you have your async pure function with error handling, move it to a module. You have three options:

* File: The easiest way is to create a file and import it with `require()`
* Module: You can create a folder with `index.js` and move it to `node_modules`. This way you don't have to worry about pesky `__dirname` and `path.sep`). Set `private: true` to avoid publishing.
* npm Module: Take your module a step further by publishing it on npm registry

In either case, you would use CommonJS/Node syntax for modules since the ES6 import is nowhere near TC39 or Node Foundation roadmap (as of Dec 2016 and a talk from the main contributor I've heard at Node Interactive 2016). The rule of thumb when creating a module is *what you export is what you import*. In our case, it's function so:

```js
module.exports = (limit, callback) => {
  //...
}
```

And in the main file, you import with `require`. Just don't use capital case or underscores for file names. Really, don't use them:

```js
const generateRandomNumber = require('./generate-random-number.js')
generateRandomNumber(7, (error, number) => {
  if (error) {
    console.error(error)
  } else {
    console.log(number)
  }
})
```

Aren't you happy that `generateRandomNumber` is pure? :-) I bet it would have taken you longer to modularize an impure function, due to the tight coupling. 

To sum up, for beautiful function, you would typically make the asynchronous, have data as the first argument, options as the second and callback as the last. Also, make the options an optional argument and thus callback can be second or third argument. Lastly, the callback will pass error as *first* argument event if it's just null (no errors) and data as the last (second) argument.

## Beautiful Classes in Node: Diving into OOP with Classes

I'm not a huge fan of ES6/ES2015 [classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes). I use function factories (a.k.a. functional inheritance pattern) as much as I can. However, I expect more people would start coding in Node who came from front-end or Java background. For them, let's take a look at the OOP way to inherit in Node:

```js
class Auto {
  constructor({make, year, speed}) {
    this.make = make || 'Tesla'
    this.year = year || 2015
    this.speed = 0
  }
  start(speed) {
    this.speed = speed
  }
}
let auto = new Auto({})
auto.start(10)
console.log(auto.speed)
```

The way class is initialized (`new Auto({})`) is similar to a function call in the previous section, but here we pass an object instead of three argument. Passing an object (you can call it `options`) is a better more beautiful pattern since it's more versatile. 

Interestingly enough, as with functions, we can create named functions (example above) as well as  anonymous classes by storing them in variables (code below):

```js
const Auto = class {
  ...
}
```

The methods like the one called `start` in the snippet with `Auto` are called prototype or instance method. As with other OOP languages, we can create static method. They are useful when methods don't need access to an instance. Let's say you are a starving programmer at a startup. You saved $15,000 from your meager earning by eating ramen noodles. You can check if that enough to calling a static method `Auto.canBuy` and there's no car yet (no instance).


```js
class Auto {
  static canBuy(moneySaved) {
    return (this.price<moneySaved)
  }
}
Auto.price = 68000

Auto.canBuy(15000)
```

Of course, it all would have been too easy if TC39 included the standard for static class attributes such as `Auto.price` so we can define them right in the body of class instead of outside, but no. They didn't include class attribute in ES6/ES2015. Maybe we'll get it next year.

To extend a class, let's say our automobile is a Model S Tesla, there's `extends` operand. We must call `super()` if we overwrite `constructor()`. In other words, if you extend a class and define your own constructor/initializer, then please invoke super to get all the things from the parent (Auto in this case).

```js
class Auto {
}
class TeslaS extends Auto {
  constructor(options) {
    super(options)
   }
}
```

To make this beautiful, define an interface, i.e., public methods and attributes/properties of a class. This way the rest of the code can stay ugly and/or change more often without causing any frustration or anger to developers who used the private API (sleep and coffee deprived developers tend to be the angriest—have a snack handy in your backpack for them in case of an attack).

Since, Node/JavaScript is loosely typed. You should put extra effort in documentation than you would normally do when creating classes in other language with strong typing. Good naming is part of documentation. For example, we can use `_` to mark a private method:

```js
class Auto {
  constructor({speed}) {
    this.speed = this._getSpeedKm(0)
  }
  _getSpeedKm(miles) {    
    return miles*1.60934
  }
  start(speed) {
    this.speed = this._getSpeedKm(speed)
  }
}
let auto = new Auto({})
auto.start(10)
console.log(auto.speed)
```

All the things related to modularizing described in the section on functions apply to classes. The more granular and loosely coupled the code, the better.

Okay. This is enough for now. If your mind craves more of this ES6/ES2015 stuff, check out my [cheatsheet](https://node.university/p/library) and [blog post](https://webapplog.com/es6).  


You might wonder, when to use a function and when a class. It's more of an art than a science. It's also depends on your background. If you spent 15 years as a Java architect, it'll be more natural for you to create classes. You can use Flow or TypeScript to add typing. If you are more of a functional Lisp/Clojure/Elixir programmer, then you'll lean towards functions.

## Wrap-up

That's was a hell of a long essay but the topic is not trivial at all. Your well being might depend on it, i.e., how much maintenance the code will require. Assume that all the code is written to be changed. Separate things which change more often (private) from other things. Expose only interfaces (public) and make them robust to changes as much as possible. 

Lastly, have unit tests. They will serve as documentation and also make your code more robust. You will be able to change the code with more confidence once you have a good test coverage (preferably automated as GitHub+CI, e.g. CircleCI or Travis).

And keep on Nodding!
