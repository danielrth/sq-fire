
var viewIDs = ['#dlg-login', '#dlg-reg-user', '#dlg-reset-pwd', '#dlg-add-site', '#dlg-review-time']; //layout IDs for dialogs
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
	     $('#sel-in-unit,#th-sel-unit')
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
	$('#txt-review-start-time').datetimepicker({
		controlType: 'select',
		oneLine: true,
		dateFormat: 'M.d yy,', 
		timeFormat: 'h:mm tt'
	});
	$('#txt-review-end-time').datetimepicker({
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
	$('#mnu-logged button').removeClass('active');
	if (stat == 1) {
		$('#btn-stat-addsite').addClass('active');
	}
	else if (stat ==2) {
		$('#btn-stat-review').addClass('active');
		$('#txt-review-start-time').datetimepicker('setDate', new Date( (new Date()).getTime() - 1000*3600*24*28 ) );
		$('#txt-review-end-time').datetimepicker('setDate', new Date( ) );
		switchPopupView(4);
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

    			loadUserSites((new Date()).getTime() - 1000*3600*24*28, (new Date()).getTime());
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

function loadUserSites (startTimestmap, endTimestamp) {
	userSitesData = {};
	$('#tbl-user-sites tbody').html('');

	firebase.database().ref().child('sites')
	.orderByChild("userid").equalTo(firebase.auth().currentUser.uid)
	// .orderByChild('injtime').startAt(startTimestmap).endAt(endTimestamp)
	.on("child_added", function(snapshot) {
	  		
  		if (snapshot.val().injtime < startTimestmap || snapshot.val().injtime > endTimestamp)
  			return;

  		userSitesData[snapshot.key] = snapshot.val();
  		drawTableFromArray();
  		// var injtime = formatDate (new Date(snapshot.val().injtime));
  		// var trHtml = 
  		// 	"<tr id=trsite_" + snapshot.key + " onClick=highlightSite(this)><td>" + injtime  + "</td><td>" 
  		// 	+ ($('#th-sel-unit').val() == 0 ? snapshot.val().asbg : Math.round(snapshot.val().asbg/18)) + "</td><td>" 
  		// 	+ $('#th-sel-unit option:selected').text() + "</td><td>" 
  		// 	+ (snapshot.val().isPainful=='yes' ? 'X':'') + "</td><td>" 
  		// 	+ (snapshot.val().isBleeding=='yes' ? 'X':'') + "</td><td>" 
  		// 	+ (snapshot.val().isRash=='yes' ? 'X':'') + "</td><td>" 
  		// 	+ (snapshot.val().isErratic=='yes' ? 'X':'') + "</td><td>"
  		// 	+ "<a href='#' onClick=editSiteRecord('"+ snapshot.key +"') >CHANGE</a></td><td>"
  		// 	+ "<a href='#' onClick=removeSite('"+ snapshot.key +"') >DELETE</a></td></tr>";
  		// // $('#tbl-user-sites tbody').html($('#tbl-user-sites tbody').html() + trHtml);
  		// $('#tbl-user-sites tbody').append(trHtml);

  		// $('#pin_' + snapshot.key).remove();
  		// var pin = addPinOnImage(snapshot.val().locX, snapshot.val().locY);
  		// pin.attr('id', 'pin_' + snapshot.key);
  		// evaluateAreas();
	});

	firebase.database().ref().child('sites').orderByChild("userid").equalTo(firebase.auth().currentUser.uid).on("child_removed", function(snapshot) {

		delete userSitesData[snapshot.key];

		$('#trsite_' + snapshot.key).remove();
		$('#pin_' + snapshot.key).remove();
	});

	firebase.database().ref().child('sites').orderByChild("userid").equalTo(firebase.auth().currentUser.uid).on("child_changed", function(snapshot) {

		userSitesData[snapshot.key] = snapshot.val();
		var tdsInChangeRow = $('#trsite_' + snapshot.key + ' td');
		tdsInChangeRow[1].innerHTML = snapshot.val().asbg;
		tdsInChangeRow[3].innerHTML = snapshot.val().isPainful=='yes' ? 'X':'';
		tdsInChangeRow[4].innerHTML = snapshot.val().isBleeding=='yes' ? 'X':'';
		tdsInChangeRow[5].innerHTML = snapshot.val().isRash=='yes' ? 'X':'';
		tdsInChangeRow[6].innerHTML = snapshot.val().isErratic=='yes' ? 'X':'';
	});
}

function drawTableFromArray() {
	$('#tbl-user-sites tbody').html('');
	$('.site-pin:not(#site-pin-smp)').remove();

	var trHtml = '';
	for (var key in userSitesData) {
		var injtime = formatDate (new Date(userSitesData[key]['injtime']));
  		trHtml += 
  			"<tr id=trsite_" + key + " onClick=highlightSite(this)><td>" + injtime  + "</td><td>" 
  			+ ($('#th-sel-unit').val() == 0 ? userSitesData[key]['asbg'] : Math.round(userSitesData[key]['asbg']/18)) + "</td><td>" 
  			+ $('#th-sel-unit option:selected').text() + "</td><td>" 
  			+ (userSitesData[key]['isPainful']=='yes' ? 'X':'') + "</td><td>" 
  			+ (userSitesData[key]['isBleeding']=='yes' ? 'X':'') + "</td><td>" 
  			+ (userSitesData[key]['isRash']=='yes' ? 'X':'') + "</td><td>" 
  			+ (userSitesData[key]['isErratic']=='yes' ? 'X':'') + "</td><td>"
  			+ "<a href='#' onClick=editSiteRecord('"+ key +"') >CHANGE</a></td><td>"
  			+ "<a href='#' onClick=removeSite('"+ key +"') >DELETE</a></td></tr>";

  		var pin = addPinOnImage(userSitesData[key]['locX'], userSitesData[key]['locY']);
  		pin.attr('id', 'pin_' + key);
	}

  	evaluateAreas();
	$('#tbl-user-sites tbody').html(trHtml);
}

function evaluateAreas() {
	var objSize = Object.keys(userSitesData).length;
	if (objSize < 3) { return; }
	var asbgSum = 0;
	var minAsbg = 1000;
	for (var key in userSitesData) {
		asbgSum += parseInt (userSitesData[key]['asbg']);
		if (userSitesData[key]['asbg'] < minAsbg)
			minAsbg = userSitesData[key]['asbg'];
	}
		
	var mean = asbgSum / objSize;
	var distSum = 0;
	for (var key in userSitesData) {
		distSum += (mean - userSitesData[key]['asbg']) * (mean - userSitesData[key]['asbg']);
	}
	var deviation =  Math.sqrt(distSum / (objSize - 1));

	$('#overlay-min-mean').html(Math.round(mean - deviation));
	$('#overlay-max-mean').html(Math.round(mean + deviation));
	$('#info-review').html("Mean: " + Math.round(mean) + " mg/dl &emsp;" + "Standard Deviation: " + Math.round(deviation));

	for (var key in userSitesData) {
		var pin = $('#pin_' + key);
		var imgURL = '';
		if (userSitesData[key]['asbg'] < mean - deviation)
			imgURL = 'https://static1.squarespace.com/static/53716c1de4b07f5891299dc4/t/5873a1a4b3db2b522257b60c/1483973028286/green_pin.png';
		else if (userSitesData[key]['asbg'] > mean + deviation)
			imgURL = 'https://static1.squarespace.com/static/53716c1de4b07f5891299dc4/t/5873a1aebebafb70ccf50fac/1483973038876/red_pin.png';
		else
			imgURL = 'https://static1.squarespace.com/static/53716c1de4b07f5891299dc4/t/5873a1709f7456f75fb44e2b/1483972976488/blue_pin.png';
		pin.css('background-image', "url('" + imgURL +"')");
	}
}

function reviewUnitChange () {
	
	for (var key in userSitesData) {
		var tdsInChangeRow = $('#trsite_' + key + ' td');
		tdsInChangeRow[1].innerHTML = $('#th-sel-unit').val() == 0 ? userSitesData[key]['asbg'] : Math.round(userSitesData[key]['asbg']/18);
		tdsInChangeRow[2].innerHTML = $('#th-sel-unit option:selected').text();
	}
}
/*----------------------start of button handlers--------------------*/
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
		newSiteData['locX'] = userSitesData[editingSiteId]['locX'];
		newSiteData['locY'] = userSitesData[editingSiteId]['locY'];

		updates['/sites/' + editingSiteId] = newSiteData;
		console.log(firebase.database().ref().update(updates));
	}
	
	switchPopupView(-1);
}

function removeSite(siteKey) {
	if (confirm("Are you sure to delete this site?")) {
		var updates = {};
		updates['/sites/' + siteKey] = null;
		console.log(firebase.database().ref().update(updates));
	}
}

function editSiteRecord(siteId)  {
	// if (flowStatus != 2) {return;}

	// var indexOfLimiter = eleId.indexOf('_');
	// var siteId = eleId.substr(indexOfLimiter+1, eleId.length - indexOfLimiter + 1);
	editingSiteId = siteId;

	$('#txt-in-asbg').val(userSitesData[siteId]['asbg']);
	$('#txt-in-time').datetimepicker('setDate', ( new Date( userSitesData[siteId]['injtime'] ) ) );
	$('#chk-in-painful').prop('checked', userSitesData[siteId]['isPainful'] == 'yes' ? true : false);
	$('#chk-in-bleeding').prop('checked', userSitesData[siteId]['isBleeding'] == 'yes' ? true : false);
	$('#chk-in-rash').prop('checked', userSitesData[siteId]['isRash'] == 'yes' ? true : false);
	$('#chk-in-erratic').prop('checked', userSitesData[siteId]['isErratic'] == 'yes' ? true : false);

	$('#dlg-add-site').show();
} 

function highlightSite(eleTr) {
	var eleId = eleTr.id;
	var indexOfLimiter = eleId.indexOf('_');
	var siteId = eleId.substr(indexOfLimiter+1, eleId.length - indexOfLimiter + 1);
	var elePin = $('#pin_' + siteId);

	if (eleTr.className == 'active') {
		eleTr.className = '';
		elePin.removeClass('site_pin_active');
	}
	else {
		eleTr.className = 'active';
		elePin.addClass('site_pin_active');	
	}
}

function downlightSite(eleId) {
	var indexOfLimiter = eleId.indexOf('_');
	var siteId = eleId.substr(indexOfLimiter+1, eleId.length - indexOfLimiter + 1);
	var elePin = $('#pin_' + siteId);
	elePin.removeClass('site_pin_active');
}

function selectTimeRange () {
	var startTime = $('#txt-review-start-time').datetimepicker('getDate').getTime();
	var endTime = $('#txt-review-end-time').datetimepicker('getDate').getTime();

	loadUserSites (startTime, endTime);
	switchPopupView(-1);
}

function sortTable(fieldNum) {
	
}
/*-------------------end of button handlers------------------*/
/*-----------------------start of auth---------------------------*/
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
/*-----------------------end of auth---------------------------*/
/*--------------------start of utility functions------------------*/
function cancelNewSite() {
	editingPin.remove();
	switchPopupView(-1);
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

function addPinOnImage(offsetX, offsetY) {
	var posX = offsetX + imageMargin - $('#site-pin-smp').width()/2,
        posY = offsetY + imageMargin - $('#site-pin-smp').height()/2;

	editingPin = $('#site-pin-smp').clone();
	editingPin.appendTo('#container-img');
	editingPin.show();
	editingPin.css('left', posX);
	editingPin.css('top', posY);
	$('#site-pin-smp').hide();
	return editingPin;
}

/*------------------end of utility functions------------------*/		