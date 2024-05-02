import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { catchError, from } from 'rxjs';
import { ApiService } from '../api.service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Token } from '@angular/compiler';

@Component({
  selector: 'app-authentication',
  templateUrl: './authentication.component.html',
  styleUrls: ['./authentication.component.css']
})

export class AuthenticationComponent {
  accessToken: string | null = null;
  authenticated: boolean;
  responseMsg: string | null = null;
  b2bApplicationScope: string;

  constructor (private jwtHelper: JwtHelperService, 
    private authService: MsalService, 
    private apiService: ApiService,
    private router: Router) {
      this.authenticated = false;
      this.b2bApplicationScope = 'api://8b8c07ae-a745-4b8e-bf9c-b2782d31fce7/Authenticate';
      this.handleAuthenticationResponse();
  }

  authenticate() {
    // Prepare the application to handle the authentication response
    this.handleAuthenticationResponse();
    // Ask user to authenticate
    this.authService.loginRedirect();
  }

  private handleAuthenticationResponse() {
    // Subscribes to the observable returned by handleRedirectObservable
    // This observable sends an authentication result after a redirect
    this.authService.handleRedirectObservable().subscribe({
      // Success callback
      next: (result) => {
      
        console.log('Redirect observable result:', result);

        // Updates the authenticated state based on the presence of an account in the result
        this.authenticated = !!result && !!result.account;

        if (this.authenticated) {
          // If true, attempts to silently acquire an access token
          this.acquireAccessToken();
        }
      },
      // Error callback
      error: (error) => console.error(error)
    });
  }

  // Attempts to acquire an access token
  private acquireAccessToken() {
    const account = this.authService.instance.getAllAccounts()[0];

    if (account) {
      from(this.authService.instance.acquireTokenSilent({
        scopes: [this.b2bApplicationScope],
        account: account
      })).pipe(
        catchError(error => {
          console.error('Silent token acquisition failed, attempting interactive method', error);
          return from(this.authService.acquireTokenPopup({
            scopes: [this.b2bApplicationScope],
            account: account
          }));
        }),
        catchError(error => {
          console.error('Interactive token acquisition also failed', error);
          return [];
        })
      ).subscribe({
        next: (response) => {
          if (response) {
            this.accessToken = response.accessToken;
            console.log('Access Token:', this.accessToken);
            this.validateAccessToken();
          }
        },
        error: (err) => console.error(err),
        complete: () => console.log('Token acquisition process completed')
      });
    } else {
      console.log('No accounts found in MSAL instance.');
      this.accessToken = null;
    }
  }

  // Validate permission of user's access token
  validateAccessToken() {
    if (this.accessToken) {
      // Pass the access token to Azure Function for validation
      this.apiService.sendTokenForValidation(this.accessToken).subscribe({
        next: (response) => {
          console.log('Response from Azure function: ', response);
          this.responseMsg = response;
          // If response from Azure Function is truthy
          if (response === "true") {
            // Route to the main page
            this.router.navigate(['../dashboard'])
          }
        },
        error: (error) => {
          console.log('Error in calling Azure function: ', error);
          alert("You Don't Have Permission to Access the Application!");
          this.responseMsg = 'Error calling API: ' + error.message;
        }
      });
    }
    else {
      console.error('Access token is null');
    }
  };

  usingAngularForTokenValidation(): boolean {

    const audience = '8b8c07ae-a745-4b8e-bf9c-b2782d31fce7';
    const issuer = 'https://login.microsoftonline.com/0c73eef7-54f6-4721-8a85-ab2f14582ecc/v2.0';

    if (this.accessToken) {
      try {
        const decodedToken = this.jwtHelper.decodeToken(this.accessToken);
        const isExpried = this.jwtHelper.isTokenExpired(this.accessToken);

        if (isExpried) {
          console.error('Token has expired');
          return false;
        }

        if (decodedToken.aud != audience || decodedToken.iss != issuer) {
          console.error('Token has invalid audience or issuer');
          return false;
        }
      } catch (error) {
        console.error(error);
        return false;
      }
      return true;
    }
    else {
      return false;
    }
  }
}