#!/usr/bin/env ruby
require 'rubygems'
require 'sinatra'

set :root, File.dirname(__FILE__)
set :public_folder, Proc.new { root }

get '/' do
  redirect '/robohornet.html'
end
