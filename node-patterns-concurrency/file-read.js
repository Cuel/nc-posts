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