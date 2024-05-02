import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { PublicClientApplication, InteractionType, IPublicClientApplication } from '@azure/msal-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthenticationComponent } from './authentication/authentication.component';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import {
  MsalModule,
  MsalRedirectComponent,
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG,
  MSAL_INTERCEPTOR_CONFIG,
  MsalGuardConfiguration,
  MsalInterceptorConfiguration
} from '@azure/msal-angular';
import { DashboardComponent } from './dashboard/dashboard.component'; // Integrate MSAL into the application


// A configuration that specifies settings for MSAL instance, same info as above
const msalConfig = {
  auth: {
    clientId: '8b8c07ae-a745-4b8e-bf9c-b2782d31fce7',
    authority: 'https://login.microsoftonline.com/0c73eef7-54f6-4721-8a85-ab2f14582ecc/v2.0',
    redirectUri: 'http://localhost:4200/authentication',
    postLogoutRedirectUri: 'http://localhost:4200/authentication'
  }
};

// MSAL Instance configuration
export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication(msalConfig);
}

// MSAL Guard configuration to protect routes in Angular app
export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect // Specifies the interaction type with Azure EntraID is redirect
  };
}


// MSAL Interceptor configuration defines a configuration for the MSAL interceptor
export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  return {
    // Specifies the interaction type and a map of protected resources that require authentication
    interactionType: InteractionType.Redirect,
    protectedResourceMap: new Map([
      //
    ])
  };
}

@NgModule({
  declarations: [
    AppComponent,
    AuthenticationComponent,
    DashboardComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    MsalModule.forRoot(new PublicClientApplication(msalConfig), MSALGuardConfigFactory(), MSALInterceptorConfigFactory()),
  ],
  // dependency providers
  providers: [
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: MSALGuardConfigFactory
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: MSALInterceptorConfigFactory
    },
    {
      provide: JWT_OPTIONS,
      useValue: JWT_OPTIONS
    },
    JwtHelperService
  ],
  bootstrap: [AppComponent, MsalRedirectComponent]
})

export class AppModule { }
