import Ember from 'ember';
const { get, set } = Ember;


export default Ember.Route.extend({
  model() {
    let params = {
      name: 'Penny',
      age: 7
    };

    let dog = this.store.createRecord('dog', params);
    return dog.save();
  },

  actions: {
    dirty(prop) {
      if(!prop) {
        let props = Ember.A(['name', 'age']);
        const randomIdx = Math.floor(Math.random() * props.length);
        prop = props[randomIdx];
      }

      let val = Math.random().toString(36).substring(7);

      let model = get(this, 'currentModel');
      set(model, prop, val);
    },

    checkpoint() {
      let model = get(this, 'currentModel');
      model.checkpoint();
    }
  }
});
