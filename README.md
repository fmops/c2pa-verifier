# C2PA Verifier

A web application for verifying C2PA (Content Authenticity Initiative) metadata in digital assets.

## Features

- Verify C2PA metadata in digital assets
- Modern web interface built with Next.js
- Docker support for easy deployment
- Built with Bun for improved performance

## Prerequisites

- [Bun](https://bun.sh/) (for local development)
- [Docker](https://www.docker.com/) (for containerized deployment)

## Local Development

1. Install dependencies:
```bash
bun install
```

2. Start the development server:
```bash
bun run dev
```

The application will be available at `http://localhost:3000`.

## Docker Deployment

### Building the Image

```bash
docker build -t c2pa-verifier .
```

### Running the Container

```bash
docker run -p 3000:3000 c2pa-verifier
```

The application will be available at `http://localhost:3000`.

## Kubernetes Deployment

The application can be deployed to Kubernetes using Kustomize:

```bash
# Deploy the application
kubectl apply -k ./kustomize
```

To verify the deployment:
```bash
# Check if pods are running
kubectl get pods -n c2pa-verifier

# Check the service
kubectl get svc -n c2pa-verifier
```

To remove the deployment:
```bash
kubectl delete -k ./kustomize
```

## Project Structure

- `/src` - Source code
- `/public` - Static assets
- `/k8s` - Kubernetes deployment configurations

## Environment Variables

The following environment variables can be configured:

- `NODE_ENV` - Node environment (default: production)
- `PORT` - Server port (default: 3000)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.