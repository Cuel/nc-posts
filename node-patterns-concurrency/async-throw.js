try {
  setTimeout(function(){  throw new Error('BOOM!')}, 0)
} catch (error) {
  console.error(error)
}
console.log('KA...')