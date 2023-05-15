<?php

$curl = curl_init();

$_POST = array(
	"sid" => "2MSedBjT2fg"
);
curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.matterport.com/api/models/graph',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>'{                                                
  	"query":"mutation addMattertagBulk(
	 $floorId: ID!,
	 $color: String,
	 $descriptionEncoded: String,
	 $labelEncoded: String,
	 $enabled: Boolean!,
	 $anchorPositionX: Float!,
	 $anchorPositionY: Float!,
	 $anchorPositionZ: Float!,
	 $stemEnabled: Boolean!,
	 $stemNormalX: Float!,
	 $stemNormalY: Float!,
	 $stemNormalZ: Float!,
	 $mediaType: MattertagMediaType,
	 $mediaUrl: String,
	 $stemLength: Float!
 ){
   addMattertag(
	 modelId: "' . $_POST["sid"] . '", 
	 field: id, 
	 mattertag: { 
	   floorId: ' . $_POST["floorId"] ',
	   enabled: $enabled,
	   color: $color,
	   label: $labelEncoded,
	   description: $descriptionEncoded,
	   anchorPosition: { x: $anchorPositionX, y: $anchorPositionY, z: $anchorPositionZ },
	   mediaType: $mediaType,
	   mediaUrl: $mediaUrl,
	   stemEnabled: $stemEnabled,
	   stemNormal: { x : $stemNormalX , y: $stemNormalY, z: $stemNormalZ }, 
	   stemLength: $stemLength
	 }
   ) {
	 id
   }
 }"}';

$response = curl_exec($curl);

curl_close($curl);
echo $response;