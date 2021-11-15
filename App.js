import React from 'react';
import { StyleSheet, Text, Button, View, Platform } from 'react-native';

import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAutoDiscovery, useAuthRequest, ResponseType, exchangeCodeAsync, GrantType, fetchDiscoveryAsync, refreshAsync } from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';

WebBrowser.maybeCompleteAuthSession();

const redirectUri = makeRedirectUri({useProxy: false});

export default function App() {
  //discover auth0 config from https://dev-fjul39cb.us.auth0.com/.well-known/openid-configuration
  const discovery = useAutoDiscovery('https://dev-fjul39cb.us.auth0.com');
  //console.log(discovery);

  //include 'offline_access' scope to request refresh_token
  //https://auth0.com/learn/refresh-tokens/
  const config = {
    responseType: ResponseType.Code,
    clientId: 'Rj2Kn8EWknraiaOhJg7vkFJ2kaXmKkqQ',
    redirectUri, 
    scopes: ['openid','profile','email','offline_access'],
  };

  const [ request, result, promptAsync ] = useAuthRequest(config,discovery);

  const [ token, setToken ] = React.useState(null);
  //const tokenRef = React.useRef(token);

  const [ userInfo, setUserInfo ] = React.useState(null);

  /*
  React.useEffect(()=>{
    console.log("AuthRequest");
    console.log(request);
  },[request]);
  */

  const exchangeTokenAsync = async (request,result,discovery) => {
    if (result?.type === 'success') {
      if (Platform.OS !== 'web') {
        SecureStore.setItemAsync("MyKey",JSON.stringify(result.params));
      }

      const { clientId, codeVerifier } = request;
      const { code } = result.params;

      const token2 = await exchangeCodeAsync({
        clientId,
        code,
        redirectUri: "exp://yu-iqj.kwonghung-yip.oauth0-login-poc.exp.direct:80/",//"https://auth.expo.io/",*/
        extraParams: {
          "grant_type": `${GrantType.AuthorizationCode}`,
          "code_verifier": codeVerifier,
        }
      },discovery);

      //console.log(token2);
      SecureStore.setItemAsync("accessToken",token2.accessToken);
      SecureStore.setItemAsync("refreshToken",token2.refreshToken);
      setToken(token2);
    }
  }

  React.useEffect(()=>{
    //console.log("AuthSessionResult");
    //console.log(result);
    if (request !==null && discovery !== null) {
      exchangeTokenAsync(request,result,discovery);
    }
  },[result]);

  const fetchUserInfoAsync = async (token, discovery) => {
    //console.log(token);

    const userInfoResponse = await fetch(discovery.userInfoEndpoint,{
      method: 'GET',
      headers: {
        "Content-Type":"application/json",
        "Authorization":`Bearer ${token.accessToken}`,
      }
    });
    
    const json = await userInfoResponse.json();
    //console.log(json);
    setUserInfo(json);
  }

  const refreshTokenAsync = async (request,token,discovery) => {
    const clientId = request.clientId;
    const refreshToken = token.refreshToken;

    console.log(`clientId:${clientId},refreshToken:${refreshToken}`);

    setTimeout(async () => {
      const token2 = await refreshAsync({
        clientId,
        refreshToken,
        extraParams: {
          "grant_type": GrantType.RefreshToken,
        }
      },discovery);

      console.log(token2);
      SecureStore.setItemAsync("accessToken",token2.accessToken);
      SecureStore.setItemAsync("refreshToken",token2.refreshToken);
      setToken(token2);

    },5000);
  }

  React.useEffect(()=> {
    if (token!==null) {
      fetchUserInfoAsync(token,discovery);
      refreshTokenAsync(request,token,discovery);
    }
  },[token]);

  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app! Too471!</Text>
      
      <Button title="login" disabled={!request} onPress={() => promptAsync({useProxy:false})}/>
      <Text>Access Token: {token?.accessToken}</Text>
      <Text>Refresh Token: {token?.refreshToken}</Text>
      <Text>Email form userInfo: {userInfo?.email}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
