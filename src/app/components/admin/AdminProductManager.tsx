import React, { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  imageUrl: string;
}

const AdminProductManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // TODO: Fetch products from backend
    // setProducts(fetchedProducts);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedProduct || !imageFile) return;
    setUploading(true);
    // TODO: Upload image to backend and update product
    // await uploadProductImage(selectedProduct.id, imageFile);
    setUploading(false);
    setImageFile(null);
    // TODO: Refresh products list
  };

  return (
    <div>
      <h2>Product Image Manager</h2>
      <ul>
        {products.map(product => (
          <li key={product.id}>
            <span>{product.name}</span>
            <img src={product.imageUrl} alt={product.name} width={60} />
            <button onClick={() => setSelectedProduct(product)}>Upload Image</button>
          </li>
        ))}
      </ul>
      {selectedProduct && (
        <div>
          <h3>Upload Image for {selectedProduct.name}</h3>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          <button onClick={handleUpload} disabled={uploading || !imageFile}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminProductManager;
