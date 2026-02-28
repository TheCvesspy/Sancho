# OpenAPI Generation

Sancho API OpenAPI documents are generated from ASP.NET endpoint contracts (Minimal APIs + metadata in code).

## Source of truth

- Endpoint mapping and contracts in:
  - `backend/Sancho.API/Program.cs`
  - `backend/Sancho.Modules/*/...Endpoints.cs`
- Event module contracts:
  - `backend/Sancho.Modules/EventManagement/EventEndpoints.cs`

## Generate

Run from repository root:

```powershell
dotnet build .\backend\Sancho.API\Sancho.API.csproj /t:OpenApiGenerateDocuments
```

Generated file location:

- `docs/api/sancho-openapi.json`

## Notes

- Build-time generation is defined in `backend/Sancho.API/Sancho.API.csproj` via a custom MSBuild target `OpenApiGenerateDocuments`.
- The target runs `backend/generate_openapi.ps1`, which:
  - starts the API locally on `http://127.0.0.1:5099` (no-build),
  - downloads `/openapi/v1.json`,
  - saves to `docs/api/sancho-openapi.json`,
  - stops the process.
- Runtime OpenAPI endpoint is still available in development through `MapOpenApi()`.
