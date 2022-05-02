document.addEventListener('DOMContentLoaded', function() {
	// Use buttons to toggle between views
	document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
	document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
	document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
	document.querySelector('#compose').addEventListener('click', () => {
		document.querySelector('#compose-recipients').value = '';
		document.querySelector('#compose-subject').value = '';
		document.querySelector('#compose-body').value = '';
		compose_email();
	})
	// By default, load the inbox
	document.querySelector('#failed').style.display = 'none';
	load_mailbox('inbox');
});

function compose_email() {
	// Hide other views
	if (document.querySelector('#mail')) {
		document.querySelector('#mail').remove();
	}
	document.querySelector('#emails-view').style.display = 'none';

	var recipients = document.querySelector('#compose-recipients');
	var subject = document.querySelector('#compose-subject');
	var body = document.querySelector('#compose-body');
	// Convert new line breaks in textarea to new lines.
	body.value = body.value.split("<br/>").join("\n");
	// Show compose field
	document.querySelector('#compose-view').style.display = 'block';

	document.querySelector('#compose-form').onsubmit = () => {
		fetch('/emails', {
			method: 'POST',
			body: JSON.stringify({
				recipients: recipients.value,
				subject: subject.value,
				// Convert new lines in textarea to line breaks.
				body: body.value.split("\n").join("<br/>")
			})
		}).then(response => {
			load_mailbox('sent');
			// Display error if recipient does not exist.
			if (!response.ok) {
				const err = `
      <span> falied to send your mail to "${recipients.value}". Recipient doesn't exist :(  </span>`;
				document.querySelector('#failed').innerHTML = err;
				document.querySelector('#failed').style.display = 'block';
				setTimeout(() => {
					document.querySelector('#failed').style.display = 'none'
				}, 3000);
			}
		})
		return false;
	}
}

function load_mailbox(mailbox) {
	// Hide other views
	if (document.querySelector('#mail')) {
		document.querySelector('#mail').remove();
	}
	document.querySelector('#compose-view').style.display = 'none';
	document.querySelector('#emails-view').style.display = 'none';

	// Show the mailbox name
	document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

	var emailsList = document.querySelector('#emails-view');
	fetch(`/emails/${mailbox}`).then((response) => response.json()).then((emails) => {
		var buttons = document.createElement('div');
		buttons.id = "buttons";
		emails.forEach((email) => {
			var user = document.querySelector('#user').value;
			var item = document.createElement('div');
			// Conditional statements to assign emails to specific mailbox based on the info API returns
			if (mailbox == 'inbox' && email.sender == user && email.recipients != user || mailbox == 'sent' && email.sender != user || mailbox != 'archive' && email.archived == true) {
				item.remove();
			} else {
				if (mailbox == 'sent') {
					item.innerHTML = `<div class="content" id=${email.id}><p>${email.timestamp}</p>to ${email.recipients}: ${email.subject}</div>`;
				} else {
					if (email.archived == true) {
						item.innerHTML = `<div class="content" id=${email.id}><p>${email.timestamp}</p>from ${email.sender}: ${email.subject}</div><div id = "archive" style="background-color:red;">unarchive</div>`;
					} else {
						item.innerHTML = `<div class="content" id=${email.id}><p>${email.timestamp}</p>from ${email.sender}: ${email.subject}</div><div id = "archive" style="background-color:#4CAF50;">archive</div>`;
					}
				}
				buttons.appendChild(item);
				item.className = "button";
				emailsList.appendChild(buttons);
				var content = document.querySelectorAll(`.content`);
				//Change email background to gray in mailbox if it has been read
				Array.from(content).forEach(() => {
					if (email.read == true) {
						item.style.backgroundColor = "#E8E8E8";
					}
					else {
						item.style.backgroundColor = "white";
					}
				});
			}
		});
		// Show mailbox
		document.querySelector('#emails-view').style.display = 'block';

		// Determine the count of emails in mailbox
		try {
			var num = document.querySelector("#buttons").childElementCount;
		} catch (err) {
			var num = null;
		}

		var content = document.querySelectorAll(`.button .content`);
		var archive = document.querySelectorAll(".button #archive");

		// add event listeners to content and archive buttons
		for (i = 0; i < num; i++) {
			function listen(i) {
				if (mailbox != "sent") {
					archive[i].addEventListener('click', () => {
						if (archive[i].innerHTML == "archive") {
							var state = true;
						} else {
							var state = false;
						}
						fetch(`/emails/${parseInt(content[i].id)}`, {
							method: "PUT",
							body: JSON.stringify({
								archived: state
							})
						}).then(() => {
							load_mailbox('inbox');
						});
					})
				};
				content[i].addEventListener('click', () => {
					var mail = parseInt(content[i].id);
					var openmail = document.createElement('div');
					openmail.id = "mail";
					document.querySelector(".container").appendChild(openmail);
					open_mail(mail, openmail);
				})
			}
			listen(i);
		}
	})
}

function open_mail(mail, openmail) {
	// Hide other views
	document.querySelector('#emails-view').style.display = 'none';

	var mailspace = document.createElement('div');
	var mailbody = document.createElement('div');
	mailspace.id = "mailspace";
	mailbody.id = "mailbody";
	fetch(`/emails/${mail}`).then((response) => response.json()).then(email => {
		mailspace.innerHTML = `
                                        <div><b>From: </b>${email.sender}</div>
                                        <div><b>To: </b>${email.recipients}</div>
                                        <div><b>Subject: </b>${email.subject}</div>
										<div><b>timestamp: </b>${email.timestamp}</div>
                                        <br>
                                        <button class="btn btn-sm btn-outline-primary" id="reply">reply</button>
                                        <hr style="width:73vw;"><div>${email.body}</div></hr>`;
		openmail.appendChild(mailspace);
		fetch(`/emails/${mail}`, {
			method: "PUT",
			body: JSON.stringify({
				read: true
			})
		})
		document.querySelector("#reply").addEventListener('click', () => reply(mail));;
	})
}

function reply(mail) {
	fetch(`/emails/${mail}`).then((response) => response.json()).then(email => {
		var body = document.querySelector('#compose-body');
		document.querySelector('#compose-recipients').value = email.sender;
		// Check if email that is sent is a reply and add the value to be prefilled appropriately
		if (email.subject.slice(0, 3) != "Re:") {
			document.querySelector('#compose-subject').value = "Re: " + email.subject;
			body.value = `On ${email.timestamp} ${email.sender} wrote:\n${email.body}\nOn ${email.timestamp} ${email.recipients} replied:\n`;
		} else {
			document.querySelector('#compose-subject').value = email.subject;
			body.value = `${email.body}\nOn ${email.timestamp} ${email.recipients} replied:\n`;
		}
		compose_email();
	})
}