'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

exports.sendNewMessageNotification = functions.database.ref('/notificationRequests/{requestId}').onWrite(event => {
  // If un-follow we exit the function.
  // event.data ==>
  // {
  //   "groupID": "-KaQn_yM9zan5kQmZ44Z",
  //   "payload": "The fact is I don't like being single",
  //   "senderID": "GTgO4NmBrQVwaEotqEsyEI0YgFe2",
  //   "title": "yqa phonereg"
  // }
  //
  const eventData = event.data.val();
  const groupID = eventData.groupID;
  const payload = eventData.payload;
  const senderID = eventData.senderID;
  const title = eventData.title;
  const requestId = event.params.requestId;

  return admin.database().ref(`/groups/${groupID}`).once('value').then(response => {
    var uids = Object.keys(response.val().usersImgs);
    const senderUidIndex = uids.indexOf(senderID);
    uids.splice(senderUidIndex, 1);
    return uids;
  }).then(uids => {
     var i, uid, fetchNotificationTokenPromises = [];
     for (i in uids) {
        uid = uids[i];
     	fetchNotificationTokenPromises.push(admin.database().ref(`/pushTokens/${uid}`).once('value'));
     }
     return Promise.all(fetchNotificationTokenPromises).then(results => {
      	var i, notificationTokens = [];
    	for (i in results) {
    		var res = results[i];
    		notificationTokens = notificationTokens.concat(Object.keys(res.val()));
    	}
    	return notificationTokens;
     });
  }).then(tokens => {
      const notifPayload = {
    	  notification: {
    		  title: title,
    		  body: payload
    	  }
      };

      console.log("Will be sending notification "+JSON.stringify(notifPayload) +" to tokens " + JSON.stringify(tokens));
      return admin.messaging().sendToDevice(tokens, notifPayload);
  }).then(res => {
      return admin.database().ref(`/notificationRequests/${requestId}`).remove();
  });
});
