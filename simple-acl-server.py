#This file is only required before launch to check ACLs
#After launch we can do it all with static file hosting in app.yaml

from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
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

class ACLPage(webapp.RequestHandler):
	def get(self, path):
		user = str(users.get_current_user())
		#App engine reports gmail addresses without the "gmail.com"
		if "@" not in user:
			user = user + "@gmail.com"
		#Check if the user is allowed.
		if not any(pattern.match(user) for pattern in ALLOWED_USERS):
			self.response.set_status(404)
			logging.warning("|%s| tried to log in but was blacklisted" % user)
			self.response.out.write(webapp.Response.http_status_message(404))
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
			f = open(path)
		except IOError:
			self.response.set_status(404)
			self.response.out.write(webapp.Response.http_status_message(404))
			return
		self.response.headers['Content-Type'] = FILE_TYPES[file_type]
		self.response.out.write(f.read())

application = webapp.WSGIApplication([('(.*)', ACLPage)], debug = True)

def main():
	run_wsgi_app(application)

if __name__ == "__main__":
	main()