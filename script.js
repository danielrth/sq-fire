
	var viewIDs = ['#dlg-login', '#dlg-reg-user', '#dlg-reset-pwd', '#dlg-add-site']; //layout IDs for dialogs
	var asbgUnits = ['mg/dl', 'mmol/L'];
	var flowStatusNames = ["loggedin", "addsite", "review"];	//flow status names
	var flowStatus = 0;
	var imageMargin = 25;
	var newSiteOffsetX = -50;
	var newSiteOffsetY = -50;
	var editingPin = null;
	var editingSiteId = null;
	var userSitesData = {};

	$(document).ready(function() {

		initUserAuth()
		switchPopupView(-1);

		$.each(asbgUnits, function(key, value) {   
		     $('#sel-in-unit')
		         .append($("<option></option>")
		                    .attr("value",key)
		                    .text(value)); 
		});

		$('#txt-in-asbg').keyup(function () { 
		    this.value = this.value.replace(/[^0-9\.]/g,'');
		});

		$('#txt-in-time').datetimepicker({
			controlType: 'select',
			oneLine: true,
			dateFormat: 'M.d yy,', 
			timeFormat: 'h:mm tt'
		});

		$('#img-body').click(function (e) {
			if ($('#dlg-add-site').is(":visible")) {
				return;
			}
			if (flowStatus == 1) //flow status for adding site
			{
				//real data to store is offsetX, offsetY
				newSiteOffsetX = e.offsetX;
				newSiteOffsetY = e.offsetY;

            	addPinOnImage(newSiteOffsetX, newSiteOffsetY);
            	
            	$('#dlg-add-site').show();
            	$('#dlg-add-site').css('top', newSiteOffsetY + 200);
            	// $('#dlg-add-site').css('left', newSiteOffsetX);
            	$('#txt-in-time').datetimepicker('setDate', (new Date()) );
			}
		});

	});

	function switchFlowStatus (stat) {
		flowStatus = stat;
		if (stat == 1) {
			$('#btn-stat-addsite').addClass('active');
		}
		else {
			$('#btn-stat-addsite').removeClass('active');	
		}
	} 

	function switchPopupView(viewNum) {
		//hide/show popup dialogs
		for (var i = 0; i < viewIDs.length; i++) {
			if (i == viewNum)
				$(viewIDs[viewNum]).show();
			else
				$(viewIDs[i]).hide();
		}
	}

    function initUserAuth() {
    	//when user auth status changed
    	firebase.auth().onAuthStateChanged(function(user) {
    		if (user) {
    			if (user.emailVerified) {
    				// console.log(user);
    				$('#p-logged-email').html(user.email);
	    			if (user.displayName) 
	    				$('#p-logged-username').html(user.displayName);
	    			else if (user.providerData[0]['displayName']) {
	    				$('#p-logged-username').html(user.providerData[0]['displayName']);
	    			}

	    			switchPopupView(-1);
	    			$('#mnu-login').hide();
	    			$('#mnu-logged').show();
	    			$('#alt-verify').html("");

	    			loadUserSites();
    			}
    			else {
    				$('#mnu-login').show();
    				$('#mnu-logged').hide();
    				$('#alt-verify').html("Your account was not verified by email.\n Please check the verification email in your mainbox.");
    			}
    		}
    		else {
    			$('#mnu-login').show();
    			$('#mnu-logged').hide();
    		}
    	});
    }

    function handleSignin() {
    	var email = $('#txt-email').val();
        var password = $('#txt-pwd').val();
        if (email.length < 4) {
        	alert('Please enter an email address.');
        	return;
        }
        if (password.length < 4) {
        	alert('Please enter a password.');
        	return;
        }
        firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error){
        	var errorCode = error.code;
	        var errorMessage = error.message;
	        
	        if (errorCode === 'auth/wrong-password') {
	          alert('Wrong password.');
	        } else {
	          alert(errorMessage);
	        }
	        console.log(error);
        });
    }

    function handleSignup() {
    	var email = $('#txt-reg-email').val();
        var password = $('#txt-reg-pwd').val();
        var confPassword = $('#txt-reg-conf').val();
        var	username = $('#txt-reg-name').val();

	    if (username.length < 4) {
	        alert('Please enter a password.');
	        return;
	    }
        if (email.length < 4) {
	        alert('Please enter an email address.');
	        return;
	    }
	    if (password.length < 4) {
	        alert('Please enter a password.');
	        return;
	    }
	    if (password != confPassword) {
	        alert('Please confirm the entered password.');
	        return;
	    }

	    firebase.auth().createUserWithEmailAndPassword(email, password).then(function(user) {

		    user.updateProfile({
		        displayName: username
		    }).then(function() {
		        $('#p-logged-username').html(username);
		        firebase.auth().currentUser.sendEmailVerification().then(function() {
			        alert('Email Verification Sent!');
			        switchPopupView(-1);
			    });
		    }, function(error) {
		        console.error(error);
		    });        
		}, function(error) {
		    var errorCode = error.code;
		    var errorMessage = error.message;
		    alert(error.message);
		});
    }

    function handleGoogleSignin () {
    	var provider = new firebase.auth.GoogleAuthProvider();
    	provider.addScope('https://www.googleapis.com/auth/plus.login');
    	firebase.auth().signInWithPopup(provider).then(function(result) {
    		var token = result.credential.accessToken;
      		var user = result.user;
      		if (!user.emailVerified) {
      			firebase.auth().currentUser.sendEmailVerification().then(function() {
			        alert('Email Verification Sent!');
			        switchPopupView(-1);
			    });
      		}
    	}).catch(function(error) {
    		var errorCode = error.code;
    		if (errorCode === 'auth/account-exists-with-different-credential') {
	            alert('You have already signed up with a different auth provider for that email.');
	        } else {
	            console.error(error);
	        }
    	})
    }

    function handleFBSignin() {
    	var provider = new firebase.auth.FacebookAuthProvider();
    	provider.addScope('user_birthday');
    	firebase.auth().signInWithPopup(provider).then(function(result) {
        	var token = result.credential.accessToken;
          	var user = result.user;
          	if (!user.emailVerified) {
      			firebase.auth().currentUser.sendEmailVerification().then(function() {
			        alert('Email Verification Sent!');
			    });
      		}
        }).catch(function(error) {
            var errorCode = error.code;
    		if (errorCode === 'auth/account-exists-with-different-credential') {
	            alert('You have already signed up with a different auth provider for that email.');
	        } else {
	            console.error(error);
	        }
        });
    }

    function sendPasswordReset() {
      	var email =  $('#txt-re-email').val();
      	firebase.auth().sendPasswordResetEmail(email).then(function() {
        	alert('Password Reset Email Sent!');
        }).catch(function(error) {
        	var errorCode = error.code;
        	var errorMessage = error.message;
        	if (errorCode == 'auth/invalid-email') {
	        	alert(errorMessage);
	        } else if (errorCode == 'auth/user-not-found') {
	        	alert(errorMessage);
	        }
	        console.log(error);
      });
    }

    function handleSignout() {
    	switchFlowStatus(0);
    	$('#tbl-user-sites tbody').html('');
    	userSitesData = [];

    	if (firebase.auth().currentUser) {
	        // [START signout]
	        firebase.auth().signOut();
	        // [END signout]
	     }
    }

    function saveNewSite() {
    	if (!$('#txt-in-asbg').val()) {
    		alert ("Please input valid ASBG value.");
    		return;
    	}

    	if (!$('#txt-in-time').val()) {
    		alert ("Please input valid date and time value.");
    		return;
    	}

    	var asbgVal = $('#sel-in-unit').val() == 0 ? $('#txt-in-asbg').val() : $('#txt-in-asbg').val() * 18;
    	
    	var newSiteData = {
    		'userid': firebase.auth().currentUser.uid,
    		'asbg': asbgVal,
    		'injtime': $('#txt-in-time').datetimepicker('getDate').getTime(),
    		'isPainful': $('#chk-in-painful').is(':checked') ? 'yes' : 'no',
    		'isBleeding': $('#chk-in-bleeding').is(':checked') ? 'yes' : 'no',
    		'isRash': $('#chk-in-rash').is(':checked') ? 'yes' : 'no',
    		'isErratic': $('#chk-in-erratic').is(':checked') ? 'yes' : 'no'
    	};

    	var newPostKey = null;
    	var updates = {};
			
    	if (flowStatus == 1) 
		{
			newSiteData['locX'] = newSiteOffsetX;
			newSiteData['locY'] = newSiteOffsetY;

			newPostKey = firebase.database().ref().child('sites').push().key;
			updates['/sites/' + newPostKey] = newSiteData;
			console.log(firebase.database().ref().update(updates));
		}
		else if (flowStatus == 2) {
			updates['/sites/' + editingSiteId] = newSiteData;
			console.log(firebase.database().ref().update(updates));
		}
    	
		switchPopupView(-1);
    }

    function cancelNewSite() {
    	editingPin.remove();
    	switchPopupView(-1);
    }

    function loadUserSites () {
    	firebase.database().ref().child('sites').orderByChild("userid").equalTo(firebase.auth().currentUser.uid).on("child_added", function(snapshot) {
		  		
		  		userSitesData[snapshot.key] = snapshot.val();

		  		var injtime = formatDate (new Date(snapshot.val().injtime));
		  		var trHtml = 
		  			"<tr id=trsite_" + snapshot.key + " onClick=editSiteRecord(this.id)><td>" + injtime  + "</td><td>" 
		  			+ snapshot.val().asbg + "</td><td>" 
		  			+ "mg/dl" + "</td><td>" 
		  			+ getCheckboxHTML(snapshot.val().isPainful) + "</td><td>" 
		  			+ getCheckboxHTML(snapshot.val().isBleeding) + "</td><td>" 
		  			+ getCheckboxHTML(snapshot.val().isRash) + "</td><td>" 
		  			+ getCheckboxHTML(snapshot.val().isErratic) + "</td>" 
		  			+ "<td><a href='#' onClick=removeSite('"+ snapshot.key +"') >DELETE</a></td></tr>";
		  		// $('#tbl-user-sites tbody').html($('#tbl-user-sites tbody').html() + trHtml);
		  		$('#tbl-user-sites tbody').append(trHtml);

		  		addPinOnImage(snapshot.val().locX, snapshot.val().locY);
		});

		firebase.database().ref().child('sites').orderByChild("userid").equalTo(firebase.auth().currentUser.uid).on("child_removed", function(snapshot) {

			delete userSitesData[snapshot.key];

			var trSite = $('#trsite_' + snapshot.key);
			trSite.remove();
		});

		firebase.database().ref().child('sites').orderByChild("userid").equalTo(firebase.auth().currentUser.uid).on("child_changed", function(snapshot) {

			userSitesData[snapshot.key] = snapshot.val();
			var trSite = $('#trsite_' + snapshot.key);
			trSite.remove();
		});
    }

    function formatDate (dateVar) {
    	var monthNames = [
		  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
		];

		var day = dateVar.getDate();
		var monthIndex = dateVar.getMonth();
		var year = dateVar.getFullYear();

		return monthNames[monthIndex] + '. ' + day + ', ' + year;
    }

    function getCheckboxHTML(varBool) {
    	return "<input type='checkbox' onclick='return false;' " + (varBool=='yes'?'checked':'') + " />";
    }

    function addPinOnImage(offsetX, offsetY) {
    	var posX = offsetX + imageMargin - $('#site-pin-smp').width()/2,
            posY = offsetY + imageMargin - $('#site-pin-smp').height()/2;

    	editingPin = $('#site-pin-smp').clone();
    	editingPin.appendTo('#container-img');
    	editingPin.show();
    	editingPin.css('left', posX);
    	editingPin.css('top', posY);
    }

    function removeSite(siteKey) {
    	if (confirm("Are you sure to delete this site?")) {
    		var updates = {};
			updates['/sites/' + siteKey] = null;
			console.log(firebase.database().ref().update(updates));
    	}
    }

    function editSiteRecord(eleId)  {
    	if (flowStatus != 2) {return;}

    	var indexOfLimiter = eleId.indexOf('_');
    	var siteId = eleId.substr(indexOfLimiter+1, eleId.length - indexOfLimiter + 1);
    	editingSiteId = siteId;

    	console.log(eleId + ":" + siteId);

    	$('#txt-in-asbg').val(userSitesData[siteId]['asbg']);
    	$('#txt-in-time').datetimepicker('setDate', ( new Date( userSitesData[siteId]['injtime'] ) ) );
    	$('#chk-in-painful').prop('checked', userSitesData[siteId]['isPainful'] == 'yes' ? true : false);
    	$('#chk-in-bleeding').prop('checked', userSitesData[siteId]['isBleeding'] == 'yes' ? true : false);
    	$('#chk-in-rash').prop('checked', userSitesData[siteId]['isRash'] == 'yes' ? true : false);
    	$('#chk-in-erratic').prop('checked', userSitesData[siteId]['isErratic'] == 'yes' ? true : false);


    	$('#dlg-add-site').show();
    } 