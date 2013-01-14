<%@ page import='java.util.*' %>
<%@ page import='java.net.*' %>
<%@ page import='com.evernote.thrift.*' %>
<%@ page import='com.evernote.thrift.protocol.TBinaryProtocol' %>
<%@ page import='com.evernote.thrift.transport.THttpClient' %>
<%@ page import='com.evernote.edam.type.*' %>
<%@ page import='com.evernote.edam.userstore.*' %>
<%@ page import='com.evernote.edam.notestore.*' %>
<%@ page import='com.evernote.client.oauth.*' %>
<%@ page import='com.rentzso.mongo.*' %>
<%@ page import='com.rentzso.evernote.*' %>
<%@ page import='com.rentzso.credentials.*' %>
<%@ page import='org.scribe.builder.ServiceBuilder' %>
<%@ page import='org.scribe.oauth.*' %>
<%@ page import='org.scribe.model.*' %>
<%!

  static final String consumerKey = Cred.consumerKey;
  static final String consumerSecret = Cred.consumerSecret;
  
  /*
   * Replace this value with https://www.evernote.com to switch from the Evernote
   * sandbox server to the Evernote production server.
   */
  static final String urlBase = "https://sandbox.evernote.com";
  static final String userStoreUrl = urlBase +"/edam/user";
  
  static final String requestTokenUrl = urlBase + "/oauth";
  static final String accessTokenUrl = urlBase + "/oauth";
  static final String authorizationUrlBase = urlBase + "/OAuth.action";
  
  static final String callbackUrl = "index.jsp?action=callbackReturn";
%>
<%
  String accessToken = (String)session.getAttribute("accessToken");
  String requestToken = (String)session.getAttribute("requestToken");
  String requestTokenSecret = (String)session.getAttribute("requestTokenSecret");
  String verifier = (String)session.getAttribute("verifier");
  String dumpedTags = (String)session.getAttribute("dumpedTags");

  String action = request.getParameter("action");

  if ("".equals(consumerKey)) {
%>
    <span style="color:red">
    	Before using this sample code you must edit the file index.jsp
      and replace consumerKey and consumerSecret with the values that you received from Evernote.
      If you do not have an API key, you can request one from 
      <a href="http://dev.evernote.com/documentation/cloud/">http://dev.evernote.com/documentation/cloud/</a>
    </span>
<%
  } else {
    // Set up the Scribe OAuthService. To access the Evernote production service,
    // remove EvernoteSandboxApi from the provider class below.
    String thisUrl = request.getRequestURL().toString();
    String cbUrl = thisUrl.substring(0, thisUrl.lastIndexOf('/') + 1) + callbackUrl;
    
    Class providerClass = org.scribe.builder.api.EvernoteApi.Sandbox.class;
    if (urlBase.equals("https://www.evernote.com")) {
      providerClass = org.scribe.builder.api.EvernoteApi.class;
    }
    OAuthService service = new ServiceBuilder()
        .provider(providerClass)
        .apiKey(consumerKey)
        .apiSecret(consumerSecret)
        .callback(cbUrl)
        .build();

	  if (action != null) {    

      try {
        if ("callbackReturn".equals(action)) {
          // After obtaining evernote authorization
          // set the session verifier
          requestToken = request.getParameter("oauth_token");
          verifier = request.getParameter("oauth_verifier");
          session.setAttribute("verifier", verifier);

          // Verify the session with the verifier and...

          Token scribeRequestToken = new Token(requestToken, requestTokenSecret);
          Verifier scribeVerifier = new Verifier(verifier);
          EvernoteAuthToken token = new EvernoteAuthToken(service.getAccessToken(scribeRequestToken, scribeVerifier));

          // ... obtain the accessToken
          accessToken = token.getToken();
          

          session.setAttribute("userId", token.getUserId() );

          String noteStoreUrl = token.getNoteStoreUrl();
          session.setAttribute("accessToken", accessToken);
          session.setAttribute("noteStoreUrl", noteStoreUrl);
        } else if ("dumpAll".equals(action)){
          String noteStoreUrl = (String)session.getAttribute("noteStoreUrl");
          MongoConnection m = new MongoConnection("localhost", 27017, "evernavigator");
          EvernoteHandle handle = new EvernoteHandle(accessToken, noteStoreUrl);
          EverMongoBridge bridge = new EverMongoBridge(m, handle, (Integer)session.getAttribute("userId"));
          // dump the tags in mongo
          bridge.dumpTagsToCollection("tags");
          // add notes references to each record
          bridge.dumpNotesToMongo("tags");
          pageContext.forward("?action=tagsDumped");
        } else if ("tagsDumped".equals(action)){
          // tags have been dumped
          session.setAttribute("dumpedTags", "true");
          dumpedTags = "true";
        }
      } catch (Exception e) {
        e.printStackTrace();
        out.println(e.toString());
      }
  
    
} %>
<!-- Manual operation controls -->
<hr/>
<h3>Three steps to get your evernavigator graph</h3>

<ol>
	
	

	<li>
<%
	if (requestToken == null && verifier == null) {
    // on first access set the requestToken
    Token scribeRequestToken = service.getRequestToken();
    requestToken = scribeRequestToken.getToken();
    session.setAttribute("requestToken", requestToken);
    session.setAttribute("requestTokenSecret", scribeRequestToken.getSecret());

    // this link will redirect the user to the evernote authorization page
		String authorizationUrl = authorizationUrlBase + "?oauth_token=" + requestToken;
%>
    <a href='<%= authorizationUrl %>'>Give your authorization to access your evernote</a>    
<%
	} else {
%>
	Give your authorization to access your evernote
<% } %>
	</li>

	


  <li>
<% if (accessToken != null) { %>
  <a href="?action=dumpAll">Save your tags in mongo (it will take some time)</a><br/>
<% } else { %>
  Save your tags in mongo
<% } %>
  </li>

  <li>
    <% 
    if (dumpedTags != null) { 
    // go to the d3.js graph
      String graphUrl = "http://localhost:3000/" + session.getAttribute("userId").toString();
    %>
  <a href='<%= graphUrl %>'>Get your evernote graph!</a><br/>
<% } else { %>
  Get your evernote graph!
<% } %>
  </li>
</ol>

<% } %>
