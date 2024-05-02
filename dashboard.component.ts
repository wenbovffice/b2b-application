import { Component } from '@angular/core';
import { ApiService } from '../api.service';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})

export class DashboardComponent {

  endPoint: string | null = null;
  responseMsg: string | null=null;
  newEmployee: any = {};

  constructor(private authService: MsalService, 
    private apiService: ApiService) {}
  
  // Get response of passed API End Point from BC
  getResponse(endPoint: string) {
    this.endPoint = endPoint;
    if(this.endPoint){
      // Call associated function in API service
      this.apiService.requestBusinessCentral(this.endPoint).subscribe({
        next: (response) => {
          console.log('Response from Business Central through Azure Function: ', response);
          // convert response from object  to string
          this.responseMsg = JSON.stringify(response, null, 2);
        },
        error: (error) => {
          console.log('Error from Business Central or Azure Function: ', error);
          this.responseMsg = 'Error: ' + error.message;
        }
      })
    }
  }
  // Log user out and re-direct to postLogoutRedirectUri defined in MSAL configuration
  logOut() {
    this.authService.logout();
  }
}
