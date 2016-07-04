import Ember from 'ember';
import Mirage from 'ember-cli-mirage';

export default function() {
  this.get('/dogs');

  this.post('/dogs', (db, request) => {
    let attrs = JSON.parse(request.requestBody);
    let newId = attrs.data.id;
    // Cleanup lingering id in mirage that has already been destroyed
    if(Ember.isPresent(newId)) {
      let collections = db.db._collections.filter(function(col) { return col.name === 'dogs'; });
      if(collections.length) {
        let collection = collections[0];
        let ids = collection.identityManager._ids;
        if(ids[newId]) {
          delete collection.identityManager._ids[newId];
        }
      }
    }
    let dog = db.dogs.create(attrs.data);
    return new Mirage.Response(200, {}, dog);
  });

  this.patch('/dogs/:id');
  this.del('/dogs/:id');

}
