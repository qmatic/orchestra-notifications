/*
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE 
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, 
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE 
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 *
 */
var BitlyAPI 	= require("node-bitlyapi")
  , log   		= require('npmlog');

module.exports = function(clientId, clientSecret, accessToken) {
	
	var Bitly = new BitlyAPI({
    	client_id: clientId,
    	client_secret: clientSecret  
	});

	Bitly.setAccessToken(accessToken);
	
	return {
		shorten: function(url, callback) {
			Bitly.shorten({longUrl: url}, function(err, results) {
				if(err) {
					callback(err);
				} else {
					var tmp = JSON.parse(results);
					log.verbose('', tmp);
			
					if(tmp.status_code == 200) {
						callback(null, tmp.data.url);
					} else {
						callback({code: tmp.status_code, message: tmp.status_txt});
					}
				}
			});
		}
	};
};