if (Meteor.isClient) {
  // This code only runs on the client
  Template.body.helpers({
    tasks: [
      { text: "This is task 1" },
      { text: "This is task 2" },
      { text: "This is task 3" }
    ]
  });
}

/* ----------- DEFINE COLLECTION ----------*/

Tasks = new Mongo.Collection("tasks");
if (Meteor.isServer) {
  // This code only runs on the server

  // Only publish tasks that are public or belong to the current user
  Meteor.publish("tasks", function () {
     return Tasks.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });
}
 
if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("tasks");

  Template.body.helpers({
    tasks: function () {
      // function qui montrera que les task qui ne sont pas coches
      if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter tasks
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        // Otherwise, return all of the tasks
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },  
    // for incompleteCount = compte les incomplete tasks
    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    }
  });

/* ----------- DEFINE SUBMIT (avec le entree) ----------*/

Template.body.events({
    "submit .new-task": function (event) {
      // Prevent default browser form submit
      event.preventDefault();
 
      // Get value from form element
      var text = event.target.text.value;
 
      // Insert a task into the collection
      Meteor.call("addTask", text);
      
 
      // Clear form
      event.target.text.value = "";
    
    // Event handler for checkbox
    },
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    }

  });
/* ---------  Define helper to check ownership ------*/
Template.task.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });

/* ----- Event handlers for Task buttons update or remove task ----------*/
Template.task.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setChecked", this._id, ! this.checked);
    },
    "click .delete": function () {
       Meteor.call("deleteTask", this._id);
       },

    /* ------- Add event handler to call the setPrivate method ---*/   
    "click .toggle-private": function () {
      Meteor.call("setPrivate", this._id, ! this.private);
    }
  });
/* ----- Configure accounts-ui ----------*/

Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

}

/* ----- Define some methods ----------*/

Meteor.methods({
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
 
    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteTask: function (taskId) {

// Add some extra security to methods - only the owner
var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }

    Tasks.remove(taskId);
  },
  setChecked: function (taskId, setChecked) {

// Add some extra security to methods
var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { checked: setChecked} });
    },

  /*---- Define method to set tasks to private ------*/

  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);
 
    // Make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
 
    Tasks.update(taskId, { $set: { private: setToPrivate } });
  }
});