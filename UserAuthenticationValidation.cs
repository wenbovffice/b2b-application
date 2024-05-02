using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

namespace Server.Function
{   
    public class UserAuthenticationValidation
    {
        private readonly ILogger<UserAuthenticationValidation> _logger;

        // Obntain OIDC congifuration for token validation
        private static ConfigurationManager<OpenIdConnectConfiguration> _configManager;

        private static readonly string _issuer = "https://login.microsoftonline.com//v2.0";

        static UserAuthenticationValidation()
        {
            // Initializes the configuration manager with the issuer's well-known configuration URL
            _configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
                $"{_issuer}/.well-known/openid-configuration",
                new OpenIdConnectConfigurationRetriever());
        }

        public UserAuthenticationValidation(ILogger<UserAuthenticationValidation> logger)
        {
            _logger = logger;

            // Ensure the configuration manager is initialized
            if (_configManager == null)
            {
                _configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
                    $"{_issuer}/.well-known/openid-configuration",
                    new OpenIdConnectConfigurationRetriever());
            }
        }

        // Asynchronously validates the JWT token and use the logger for error logging
        private static async Task<bool> ValidateTokenAsync(string token, ILogger logger) // Add ILogger parameter
        {
            // Fetches the configuration from Azure AD dynamically
            var config = await _configManager.GetConfigurationAsync();

            // Sets up the token validation parameters
            var validationParameters = new TokenValidationParameters
            {
                // Check iss claim
                ValidateIssuer = true,
                ValidIssuer = _issuer,

                // Check aud claim
                ValidateAudience = true,
                ValidAudience = "8b8c07ae-a745-4b8e-bf9c-b2782d31fce7", // it's the application's client ID

                // Check exp claim
                ValidateLifetime = true,

                // Verify signature
                IssuerSigningKeys = config.SigningKeys
            };

            var tokenHandler = new JwtSecurityTokenHandler();

            try
            {
                // user's access token will be validated using declared validation parameters.
                // If token is validated, it returns an object called CliamsPrincipal.
                // If token failed to validate, it throws an exception.
                var principal = tokenHandler.ValidateToken(token, validationParameters, out SecurityToken validatedToken);

                // If validated, execute the rest codes:

                var decodedToken = validatedToken as JwtSecurityToken; // Get the validated access token

                // More controls over the user's access token at our end.
                if (decodedToken != null && decodedToken.ToString().Contains("CanAccess")) // CanAccess is in roles claim of the access token, and it's configured in App Roles, Azure Entra.
                {
                    logger.LogInformation("User has the 'CanAccess' role.");

                    return true;
                }
                else
                {
                    return false;
                }
            }
            catch (Exception ex)
            {
                logger.LogError($"Token Validation Failed: {ex}");
                return false;
            }
        }

        // Azure Function serves user to sign-in the application
        [Function("UserAuthenticationValidation")]
        public async Task<IActionResult> Run([HttpTrigger(AuthorizationLevel.Anonymous, "get", "post")] HttpRequest req)
        {
            _logger.LogInformation("C# HTTP trigger function to VALIDATE user's access token.");

            // Retrieve Authorization header from the HTTP request
            string authHeader = req.Headers["Authorization"];

            // Extracts the token from the Authorization header if it starts with "Bearer ".
            var token = authHeader?.StartsWith("Bearer ") == true ? authHeader.Substring("Bearer ".Length).Trim() : null;

            _logger.LogInformation($"Extracted token: {token}");

            // Verify retrieved access token
            if (token != null && await ValidateTokenAsync(token, _logger))
            {
                return new OkObjectResult("true");
            }
            else  
            {
                // If the token is not valid, returns a HTTP 401 response.
                return new UnauthorizedResult();
            }
        }
    }
}
