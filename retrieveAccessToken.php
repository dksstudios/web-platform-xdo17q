<?php
   
   if (file_exists("../_common/tokens.php")) {
      require "../_common/tokens.php";
   }
   else {
      require "_tokens.php";
   }   
   $ch = curl_init();
   
   curl_setopt($ch, CURLOPT_URL,"https://api.matterport.com/api/oauth/token");
   curl_setopt($ch, CURLOPT_POST, 1);
   
   $query = array(
	   "grant_type" => "authorization_code",
	   "code" => $_GET["auth_code"],
	   "scope" => "ViewPublic ViewDetails EditDetails",
	   "client_id" => $oauth_client_id,
	   "client_secret" => $oauth_client_secret
   );
   
   curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query( $query ));
   curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/x-www-form-urlencoded'));
   
   // receive server response ...
   curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
   
   echo curl_exec ($ch);
   curl_close ($ch);
?>