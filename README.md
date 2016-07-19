# Ember Data Undo

An undo/redo mixin you can add to your Ember model.

# Usage

```javascript
// app/models/dog.js
import DS from 'ember-data';
import UndoRedo from 'ember-data-undo/undo-redo';
const { attr } = DS;

export default DS.Model.extend(UndoRedo, {
  name: attr('string'),
  age: attr('string')
});
```

## Installation

* `git clone` this repository
* `npm install`
* `bower install`

## Running

* `ember server`
* Visit your app at http://localhost:4200.

## Running Tests

* `npm test` (Runs `ember try:testall` to test your addon against multiple Ember versions)
* `ember test`
* `ember test --server`

## Building

* `ember build`

For more information on using ember-cli, visit [http://ember-cli.com/](http://ember-cli.com/).
