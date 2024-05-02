import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams  } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class ApiService {

  // Azure Function to validate user's identity
  private readonly accessTokenValidationUrl = "http://localhost:7095/api/UserAuthenticationValidation"; // Azure Function to validate user's identity

  // Azure Function to read data from Business Central
  private readonly acquireBusinessCentralUrl = "http://localhost:7095/api/AcquireBusinessCentral";

  constructor(private http: HttpClient) { }

  // Verify User's Access Token with Azure
  sendTokenForValidation(accessToken: string): Observable<any> {
    // Bearer user's access token in the HTTP request
    const headers = new HttpHeaders().set('Authorization', `Bearer ${accessToken}`);
    // Receives truthy value or Error 401
    return this.http.get(this.accessTokenValidationUrl, {responseType: 'text', headers});
  }

  // Fetch Data from Business Central through Azure Function
  requestBusinessCentral(apiEndPoint: string): Observable<any> {
    // Set paprameter as api end-point that to BC in the request to Azure Function
    const params = new HttpParams().set('BusinessCentralEndPoint', apiEndPoint);
    // Receives data from BC or any error
    return this.http.get(this.acquireBusinessCentralUrl, {params});
  }
}