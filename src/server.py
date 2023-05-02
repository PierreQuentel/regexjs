import http.server

port = 8001
server_address = ('', port)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)
print('server on port', port)
httpd.serve_forever()
