var functions = require('firebase-functions');
var admin = require('firebase-admin');
var cors = require('cors')({origin: true});
var webpush = require('web-push');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
var serviceAccount = require("./pwagram-fb-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pwagram-788b5.firebaseio.com/'
});

exports.storePostData = functions.https.onRequest(function(request, response) {
  cors(request, response, function() {
    admin.database().ref('posts').push({
      id: request.body.id,
      title: request.body.title,
      location: request.body.location,
      image: request.body.image
    })
      .then(function() {
        webpush.setVapidDetails('mailto:edwinchen85@gmail.com', 'BL9A9uSxr_I4dF-OXEWMHqcjRXVKK0sElW2bnFzffi6tPW_N_GWGQ8am9VUbCweYyqtre5O0EkG-gxarznT6T3U', 'jICxpG73Gd3V1PEE5G8LsZhf2-t33WDB9Yws5xt0qMU');
        return admin.database().ref('subscriptions').once('value');
      })
      .then(function(subscriptions) {
        subscriptions.forEach(function(sub) {
          var pushConfig = {
            endpoint: sub.val().endpoint,
            keys: {
              auth: sub.val().keys.auth,
              p256dh: sub.val().keys.p256dh
            }
          };

          webpush.sendNotification(pushConfig, JSON.stringify({
            title: 'New Post',
            content: 'New Post added!',
            openUrl: '/help'
          }))
            .catch(function(err) {
              console.log(err);
            });
        });
        response.status(201).json({message: 'Data stored', id: request.body.id});
      })
      .catch(function(err) {
        response.status(500).json({error: err});
      });
  });
});
