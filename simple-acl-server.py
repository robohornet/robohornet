#This file is only required before launch to check ACLs
#After launch we can do it all with static file hosting in app.yaml

import webapp2
from google.appengine.api import users

import re
import logging

FILE_TYPES = {
	"css" : "text/css",
	"html" : "text/html",
	"js" : "application/javascript",
	"png" : "image/png",
	"woff" : "application/font-woff"
}

ALLOWED_USERS = [
	"lsmith@lucassmith.name",
	"tom@tilde.io",
	"john.david.dalton@gmail.com",
	"ariya.hidayat@gmail.com",
	"joestagner@gmail.com",
	"wycats@gmail.com",
	"mathias@qiwi.be",
	"rainypixels@gmail.com",
	"elsigh@gmail.com",
	"tlrobinson@gmail.com",
	"ryan@wonko.com",
	"allenjs@gmail.com",
	"matthwk@gmail.com",
	"*@google.com"
]

ALLOWED_USERS = [re.compile("^" + pattern.replace(".", "\.").replace("*", ".*") + "$", re.IGNORECASE) for pattern in ALLOWED_USERS]

STATIC_BASE_PATH = "static/"

class ACLPage(webapp2.RequestHandler):
	def get(self, path):
		user = users.get_current_user()
		#Check if the user is allowed.
		if not user or not any(pattern.match(user.email()) for pattern in ALLOWED_USERS):
			self.response.set_status(404)
			logging.warning("|%s| tried to log in but was blacklisted" % user.email())
			self.response.out.write(webapp2.Response.http_status_message(404))
			return
		#Remove the leading /
		path = path[1:]
		if not path:
			path = "robohornet.html"
		file_type = path.split(".")[-1]
		if file_type not in FILE_TYPES:
			self.response.set_status(500)
			self.response.out.write("Disallowed file type")
			return
		try:
			f = open(STATIC_BASE_PATH + path)
		except IOError:
			self.response.set_status(404)
			self.response.out.write(webapp2.Response.http_status_message(404))
			return
		self.response.headers['Content-Type'] = FILE_TYPES[file_type]
		self.response.out.write(f.read())

app = webapp2.WSGIApplication([('(.*)', ACLPage)], debug = True)