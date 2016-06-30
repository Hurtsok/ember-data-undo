export default function() {
  this.get('/dogs');
  this.post('/dogs');
  this.patch('/dogs/:id');
  this.del('/dogs/:id');
}
