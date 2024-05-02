using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using Microsoft.Identity.Client;
using System.Net.Http.Headers;
using Microsoft.IdentityModel.Tokens;
using Azure.Core;

namespace Server.Function
{
    public class AcquireBusinessCentral
    {
        private readonly ILogger<AcquireBusinessCentral> _logger;

        // Hardcoded sensitive data for testing only
        // Consider using Azure Key Vaults for security
        private static readonly string clientId = "";
        private static readonly string clientSecret = ""; // Configured at Authentication Option in App Registration
        private static readonly string authority = "https://login.microsoftonline.com//v2.0";
        private static readonly string[] scopes = new string[] { "https://api.businesscentral.dynamics.com/.default" };

        public AcquireBusinessCentral(ILogger<AcquireBusinessCentral> logger)
        {
            _logger = logger;
        }

        // Using client credential to acquire an application level's access token.
        // Note: this access token has nothing to do with user.
        // It only serves the communication between the Azure Function and Business Central
        private static async Task<string> AcquireTokenForApplication()
        {
            // Asynchronously acquires an OAuth2 token for application (client credentials flow)
            var clientApp = ConfidentialClientApplicationBuilder.Create(clientId)
                .WithClientSecret(clientSecret)
                .WithAuthority(new Uri(authority))
                .Build();

            // Requests application token for the given scopes
            var result = await clientApp.AcquireTokenForClient(scopes).ExecuteAsync();

            return result.AccessToken;
        }

        // Performs an HTTP GET request to the Business Central API using the access token for authorization
        private static async Task<HttpResponseMessage?> RequestToBusinessCentral(string accessToken, string endpoint)
        {
            using (var httpClient = new HttpClient())
            {
                // Adds the Authorization header with the bearer token
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

                // Sends a GET request to the specified endpoint
                var response = await httpClient.GetAsync(endpoint);

                if (response.IsSuccessStatusCode)
                {
                    return response;
                }
                else
                {
                    return null;
                }
            }
        }
 
        [Function("AcquireBusinessCentral")]
        public async Task<IActionResult> Run([HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = null)] HttpRequest req)
        {
            _logger.LogInformation("C# HTTP trigger function to READ Business Central.");
           
            // Acquire an application access token
            string accessToken = await AcquireTokenForApplication();

            _logger.LogInformation(accessToken);

            // Retrieves the endpoint to call from the query parameters
            string endPoint = req.Query["BusinessCentralEndPoint"];

            // Validates that an endpoint was provided
            if (string.IsNullOrEmpty(endPoint))
            {
                _logger.LogWarning("No Business Central endpoint was provided.");
                return new BadRequestObjectResult("Missing Query Parameter: BusinessCentralEndPoint");
            }

            _logger.LogInformation($"Requested API Endpoint: {endPoint}");

            // Makes the authenticated request to the Business Central API
            HttpResponseMessage response = await RequestToBusinessCentral(accessToken, endPoint);

            // If any error occured here
            // Check Permission Configurations in Azure and Business Central
            if (response.IsSuccessStatusCode)
            {
                // Reads the response content as a string
                string data = await response.Content.ReadAsStringAsync();
                _logger.LogInformation($"Data: {data}");
                return new OkObjectResult(data);
            }
            else
            {
                // Logs and returns the error response if the API call was not successful
                _logger.LogError($"Error calling Business Central: {response.ReasonPhrase}");
                return new ObjectResult(response.ReasonPhrase)
                {
                    StatusCode = (int)response.StatusCode
                };
            }
        }
    }
}
