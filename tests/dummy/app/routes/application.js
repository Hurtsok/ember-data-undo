import Ember from 'ember';
const { get, set } = Ember;


export default Ember.Route.extend({
  model() {
    let params = {
      name: 'Penny',
      age: 7
    };

    let dog = this.store.createRecord('dog', params);
    dog.checkpoint();
    return dog.save();
  },

  actions: {
    dirty(prop) {
      let model = get(this, 'currentModel');
      if(get(model, 'isDeleted')) {
        Ember.Logger.warn('Cannot assign attribute to deleted model.');
        return;
      }

      var val = '';

      if(!prop) {
        let props = Ember.A(['name', 'age']);
        const randomIdx = Math.floor(Math.random() * props.length);
        prop = props[randomIdx];
      }

      switch(prop) {
        case 'age':
          val = Math.round(Math.random()*100);
          break;
        case 'name':
          let names = Ember.A(['Jill', 'Ryan', 'Joe', 'Clayton', 'Dave', 'X']);
          let randomNameIdx = Math.floor(Math.random() * names.length);
          val = names[randomNameIdx];
          break;
        default:
          val = Math.round(Math.random()*100);
          break;
      }

      set(model, prop, val);
    },

    checkpoint() {
      let model = get(this, 'currentModel');
      model.checkpoint();
    },

    destroyModel() {
      let model = get(this, 'currentModel');
      model.deleteRecord();
      model.checkpoint();
      model.save();
    }
  }
});
