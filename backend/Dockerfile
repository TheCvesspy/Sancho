# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution and project files for restore caching
COPY Sancho.sln .
COPY Sancho.API/Sancho.API.csproj Sancho.API/
COPY Sancho.Shared/Sancho.Shared.csproj Sancho.Shared/
COPY Sancho.Infrastructure/Sancho.Infrastructure.csproj Sancho.Infrastructure/
COPY Sancho.Modules/User/User.csproj Sancho.Modules/User/
COPY Sancho.Modules/Identity/Identity.csproj Sancho.Modules/Identity/
COPY Sancho.Modules/EventManagement/EventManagement.csproj Sancho.Modules/EventManagement/
COPY Sancho.Modules/Character/Character.csproj Sancho.Modules/Character/
COPY Sancho.Modules/Narrative/Narrative.csproj Sancho.Modules/Narrative/
COPY Sancho.Modules/Logistics/Logistics.csproj Sancho.Modules/Logistics/
COPY Sancho.Modules/NpcOrg/NpcOrg.csproj Sancho.Modules/NpcOrg/
COPY Sancho.Modules/Finance/Finance.csproj Sancho.Modules/Finance/
COPY Sancho.Modules/Communications/Communications.csproj Sancho.Modules/Communications/

RUN dotnet restore Sancho.API/Sancho.API.csproj

# Copy everything and publish
COPY . .
RUN dotnet publish Sancho.API/Sancho.API.csproj -c Release -o /app/publish

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Cloud Run sets PORT env var; ASP.NET reads ASPNETCORE_URLS
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Sancho.API.dll"]
