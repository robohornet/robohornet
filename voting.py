import webapp2, logging, json, urllib, os

from PIL import Image, ImageFont, ImageDraw

from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.api import urlfetch
from google.appengine.api import memcache

LOCAL_DEVELOPMENT_MODE = os.environ['SERVER_SOFTWARE'].startswith('Dev')

GH_COOKIE_NAME = "gh_a"

ORGANIZATION_NAME = "robohornet"
PROJECT_NAME = "robohornet"
PERFORMANCE_ISSUE_LABEL = "Performance"

#We load up the client_ID and the client_secret from a configuration file that is not open source.
try:
	config = json.load(open("client_config.json" if LOCAL_DEVELOPMENT_MODE else "client_config_production.json"))
except IOError:
	config = {}

CLIENT_ID = str(config.get("CLIENT_ID", "NO_ID"))
CLIENT_SECRET = str(config.get("CLIENT_SECRET", "NO_SECRET"))

BADGE_HEIGHT = 70
HALF_BADGE_HEIGHT = BADGE_HEIGHT / 2
PADDING = 20

VERY_LIGHT_YELLOW = (254, 241, 202, 255)
YELLOW = (252, 207, 77, 255)
LIGHT_ORANGE = (246, 148, 61, 255)

LATO = ImageFont.truetype("fonts/Lato-Regular.ttf", 46)
LATO_BLACK = ImageFont.truetype("fonts/Lato-Black.ttf", 46)

#TODO: express the resizing in terms of constants
LOGO = Image.open("robohornet.png").resize((46,46))

def draw_invalid_issue_image():
	message = "No such issue"
	text_width = LATO.getsize(message)[0]
	# End caps + width + padding plus logo overage
	width = BADGE_HEIGHT + text_width + 20 + PADDING

	im = Image.new("RGBA", (width, BADGE_HEIGHT))
	draw = ImageDraw.Draw(im)

	#First cap
	draw.ellipse([0,0, BADGE_HEIGHT, BADGE_HEIGHT], fill = LIGHT_ORANGE)

	draw.rectangle([HALF_BADGE_HEIGHT, 0, width - HALF_BADGE_HEIGHT, BADGE_HEIGHT], fill = LIGHT_ORANGE)

	draw.ellipse([width - BADGE_HEIGHT, 0, width, BADGE_HEIGHT], fill = LIGHT_ORANGE)

	im.paste(LOGO, (10, 10, 56, 56), LOGO)
	
	draw.text((HALF_BADGE_HEIGHT + PADDING + 20, 7), message, font = LATO, fill=VERY_LIGHT_YELLOW)

	return im

NO_ISSUE_IMAGE = draw_invalid_issue_image()

def draw_image(number, vote_count):
	#TODO: vote_count string should include commas.
	#calculate how wide this image will be.
	number_width = LATO.getsize("#" + str(number))[0]
	vote_count_width = LATO_BLACK.getsize(str(vote_count))[0]
	# End caps + cap in the middle + text + padding betweeen number text and surroundings + overage from the logo
	width = BADGE_HEIGHT + (BADGE_HEIGHT / 2) + number_width + vote_count_width + (PADDING  * 2) + 20

	im = Image.new("RGBA", (width, BADGE_HEIGHT))
	draw = ImageDraw.Draw(im)

	#First cap
	draw.ellipse([0,0, BADGE_HEIGHT, BADGE_HEIGHT], fill = VERY_LIGHT_YELLOW)

	draw.rectangle([HALF_BADGE_HEIGHT, 0, width - HALF_BADGE_HEIGHT, BADGE_HEIGHT], fill = VERY_LIGHT_YELLOW)

	vote_count_right_edge = width - HALF_BADGE_HEIGHT
	vote_count_left_edge = vote_count_right_edge - vote_count_width

	#End cap
	draw.ellipse([width - BADGE_HEIGHT, 0, width, BADGE_HEIGHT], fill = LIGHT_ORANGE)

	#inner cap
	draw.ellipse([vote_count_left_edge - HALF_BADGE_HEIGHT, 0, vote_count_left_edge + HALF_BADGE_HEIGHT, BADGE_HEIGHT], fill = LIGHT_ORANGE)

	draw.rectangle([vote_count_left_edge, 0, width - HALF_BADGE_HEIGHT, BADGE_HEIGHT], fill = LIGHT_ORANGE)

	im.paste(LOGO, (10, 10, 56, 56), LOGO)
	
	#Draw the issue number
	draw.text((vote_count_left_edge - HALF_BADGE_HEIGHT - PADDING - number_width, 7), str("#" + str(number)), font=LATO, fill = YELLOW)

	draw.text((vote_count_left_edge, 7), str(vote_count), font = LATO_BLACK, fill = VERY_LIGHT_YELLOW)
	return im, width

def get_or_create_issue(number, access_token=""):
	number = int(number)
	issue = Issue.all().filter('number =', number).get()
	if not issue:
		#Check if GitHub thinks this should exist.
		url = "https://api.github.com/repos/%s/%s/issues/%s" % (ORGANIZATION_NAME, PROJECT_NAME, str(number))
		response = urlfetch.fetch(url + "?access_token=" + access_token if access_token else url)
		#TODO: error handle
		data = json.loads(response.content)
		if data.get("number") != number:
			return None
		#Make sure it has the "Performance" label
		if not any(item.get("name", "").lower() == "performance" for item in data.get("labels", [])):
			return None
		#TODO: in the future we should check every so often if this issue is still valid.
		issue = Issue(number = number)
		issue.put()
	return issue

def get_cached_issue_image(issue_number):
	memcache_key = "issue_%d_image" % issue_number
	cached_values = memcache.get_multi([memcache_key, memcache_key + "_width"])
	image_data = cached_values.get(memcache_key)
	width = cached_values.get(memcache_key + "_width")
	if image_data and width:
		return Image.fromstring("RGBA", (width, BADGE_HEIGHT), image_data)
	return None

class Issue(db.Model):
	number = db.IntegerProperty(required=True)
	vote_count = db.IntegerProperty(default = 0)
	def get_image(self):
		#TODO: support multiple badge sizes
		im = get_cached_issue_image(self.number)
		if not im:
			im, width = draw_image(self.number, self.vote_count)
			memcache_key = "issue_%d_image" % self.number
			memcache.set_multi({memcache_key: im.tostring(), memcache_key + "_width" : width})
		return im
	def has_vote(self, username):
		return bool(self.get_vote(username))
	def get_vote(self, username):
		return Vote.all().filter('user =', username).filter('issue =', self).get()
	def _reset_image_cache(self):
		memcache_key = "issue_%d_image" % self.number
		memcache.delete_multi([memcache_key, memcache_key + "_width"])
	def vote(self, username):
		if self.get_vote(username):
			return False
		try:
			db.run_in_transaction(do_vote, self.key(), username)
		except:
			return False
		#ensure that later reads will get the updated version.
		self._reset_image_cache()
		return True
	def unvote(self, username):
		vote = self.get_vote(username)
		if not vote:
			return False
		try:
			db.run_in_transaction(do_unvote, self.key(), vote.key())
		except:
			return False
		#ensure that later reads will get the updated version.
		self._reset_image_cache()
		return True
	def toggle_vote(self, username):
		return self.unvote(username) if self.has_vote(username) else self.vote(username)

def do_vote(issue_key, username):
	issue = db.get(issue_key)
	vote = Vote(parent = issue, user = username, issue = issue)
	issue.vote_count = issue.vote_count + 1
	vote.put()
	issue.put()

def do_unvote(issue_key, vote_key):
	issue = db.get(issue_key)
	vote = db.get(vote_key)
	issue.vote_count = issue.vote_count - 1
	vote.delete()
	issue.put()

def get_username(access_token):
	memcache_key = access_token + "_username"
	username = memcache.get(memcache_key)
	if not username:
		response = urlfetch.fetch("https://api.github.com/user?access_token=%s" % access_token)
		#TODO: error handle
		data = json.loads(response.content)
		username = data.get("login", "")
		if username: 
			memcache.set(memcache_key, username)
	return username

class Vote(db.Model):
	user = db.StringProperty(required = True)
	issue = db.ReferenceProperty(Issue, required = True)
	timestamp = db.DateTimeProperty(auto_now_add = True)

class RoboHornetVotingPage(webapp2.RequestHandler):
	def initialize(self, request, response):
		super(RoboHornetVotingPage, self).initialize(request, response)
		self.access = self.request.cookies.get(GH_COOKIE_NAME, "")

class AuthPage(RoboHornetVotingPage):
	def get(self, issue_number):
		if not self.access:
			if self.request.get("code", ""):
				#The user said we're okay to get access. Now we need to get the access token.
				payload = {
					"client_id" : CLIENT_ID,
					"client_secret" : CLIENT_SECRET,
					"code" : self.request.get("code", ""),
					"redirect_uri" : self.request.url
				}
				#TODO: error handle
				response = urlfetch.fetch("https://github.com/login/oauth/access_token", urllib.urlencode(payload), "POST")
				#TODO: parse in a more resilient way
				access_token = response.content.split("&")[0].split("=")[1]
				self.access = access_token
				self.response.headers['Set-Cookie'] = "%s=%s; expires=Thu, 31-Dec-2020 23:59:59 GMT; path=/" % (GH_COOKIE_NAME, access_token)
			else:
				#Okay, this is the first request
				self.redirect("https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s" % (CLIENT_ID, self.request.url), False)
				return
		self.redirect("/issue/%s/" % issue_number)

class VotePage(RoboHornetVotingPage):
	def get(self, issue_number):
		if not self.access:
			self.redirect("/issue/%s/auth" % issue_number)
			return
		issue = get_or_create_issue(issue_number, self.access)
		if not issue:
			self.render_template(issue, {"error" : "That issue either doesn't exist or isn't a performance issue."})
			return
		self.render_template(issue)
	def post(self, issue_number):
		issue = get_or_create_issue(issue_number, self.access)
		if not issue:
			self.render_template(issue, {"error" : "That issue either doesn't exist or isn't a performance issue."})
			return
		if not self.access:
			self.render_template(issue, {'error': "You didn't authenticate with GitHub."})
			return
		username = get_username(self.access)
		if not username:
			self.render_template(issue, {"error" : "There was no username associated with your login."})
			return
		if not issue.toggle_vote(username):
			self.render_template(issue, {"error" : "Your action could not be registered. Please try again."})
			return
		self.render_template(issue)
	def render_template(self, issue, args = None):
		if not args:
			args = {}
		args['issue_number'] = issue.number if issue else ""
		username = get_username(self.access)
		args['username'] = username
		args['has_vote'] = issue.has_vote(username) if issue else False
		self.response.out.write(template.render("vote.html", args))


class BadgePage(RoboHornetVotingPage):
	def get(self, issue_number):
		issue_number = int(issue_number)
		im = get_cached_issue_image(issue_number)
		if not im:
			issue = get_or_create_issue(issue_number, self.access)
			im = issue.get_image() if issue else NO_ISSUE_IMAGE
		self.response.headers['Content-Type'] = "image/png"
		im.save(self.response.out, "PNG")

class NoSuchPage(webapp2.RequestHandler):
	def get(self, path):
		self.response.set_status(404)
		self.response.out.write("Invalid URL")

app = webapp2.WSGIApplication([('/issue/(\d+)/auth/?', AuthPage),
							   ('/issue/(\d+)/badge/?', BadgePage),
							   ('/issue/(\d+)/?', VotePage), 
							   ('(.*)', NoSuchPage)], debug = True)