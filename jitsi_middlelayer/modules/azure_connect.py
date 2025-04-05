from azure.storage.blob.aio import BlobServiceClient
import os
import asyncio, json
import mimetypes  # Add this import at the top
from uuid import uuid4
from config import AZURE_CONNECTION_URL
import asyncio

# asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def upload_to_azure(
    connection_string: str,
    container_name: str,
    source_file_path: str,
    destination_blob_name: str = None
) -> str:
    """
    Uploads a file to Azure Blob Storage asynchronously
    
    Args:
        connection_string: Azure storage connection string
        container_name: Name of the container to upload to
        source_file_path: Local path of file to upload
        destination_blob_name: Name for blob in Azure (defaults to filename)
    
    Returns:
        URL of the uploaded blob
    """
    if not destination_blob_name:
        destination_blob_name = os.path.basename(source_file_path)

    # Create client from connection string
    async with BlobServiceClient.from_connection_string(connection_string) as blob_service_client:
        container_client = blob_service_client.get_container_client(container_name)
        
        # Create container if it doesn't exist
        try:
            await container_client.create_container()
        except:
            pass

        blob_client = container_client.get_blob_client(destination_blob_name)
        
        # Detect mime type
        content_type, _ = mimetypes.guess_type(source_file_path)
        
        with open(source_file_path, "rb") as data:
            await blob_client.upload_blob(
                data, 
                overwrite=True,
                metadata={
                    "mimeType": content_type or "application/octet-stream"
                },
                max_concurrency=100,
            )
            
        return blob_client.url

def get_azure_config(config_path: str = "azure_config.json") -> dict:
    """Load Azure config from JSON or environment variables"""
    if os.path.exists(config_path):
        with open(config_path) as f:
            return json.load(f)
    
    return {
        "connection_string": os.getenv("AZURE_STORAGE_CONNECTION_STRING"),
        "container_name": os.getenv("AZURE_CONTAINER_NAME", "uploads")
    }

async def delete_from_azure(
    connection_string: str,
    container_name: str,
    blob_name: str
) -> bool:
    """
    Deletes a blob from Azure Blob Storage asynchronously
    
    Args:
        connection_string: Azure storage connection string
        container_name: Name of the container
        blob_name: Name of blob to delete
    
    Returns:
        True if deleted successfully, False if blob not found
    """
    async with BlobServiceClient.from_connection_string(connection_string) as blob_service_client:
        container_client = blob_service_client.get_container_client(container_name)
        blob_client = container_client.get_blob_client(blob_name)
        
        try:
            await blob_client.delete_blob()
            return True
        except Exception:  # Blob not found
            return False

# Example usage with the upload function:
async def upload_file(file_path: str):
    config = {
        "connection_string": AZURE_CONNECTION_URL,
        "container_name": "switch"
    }
    name, ext = os.path.splitext(os.path.basename(file_path))
    newFileName = f"{str(uuid4())}{ext}"

    url = await upload_to_azure(
        connection_string=config["connection_string"],
        container_name=config["container_name"],
        source_file_path=file_path,
        destination_blob_name=newFileName
    )
    return url

if __name__ == "__main__":
    print(asyncio.run(upload_file("api.py")))