#!/usr/bin/env python3
import csv
import re
from html import unescape

def clean_html(text):
    """Remove HTML tags and clean text"""
    if not text:
        return ""
    # Remove HTML tags
    clean = re.sub('<.*?>', '', text)
    # Unescape HTML entities
    clean = unescape(clean)
    # Clean up whitespace
    clean = ' '.join(clean.split())
    return clean

def convert_wix_to_shopify():
    input_file = 'catalog_products.csv'
    output_file = 'shopify_products.csv'
    
    # Shopify CSV headers
    shopify_headers = [
        'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags',
        'Published', 'Option1 Name', 'Option1 Value', 'Option2 Name', 
        'Option2 Value', 'Option3 Name', 'Option3 Value', 'Variant SKU',
        'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty',
        'Variant Inventory Policy', 'Variant Fulfillment Service', 
        'Variant Price', 'Variant Compare At Price', 'Variant Requires Shipping',
        'Variant Taxable', 'Variant Barcode', 'Image Src', 'Image Position',
        'Image Alt Text', 'Gift Card', 'SEO Title', 'SEO Description',
        'Google Shopping / Google Product Category', 'Google Shopping / Gender',
        'Google Shopping / Age Group', 'Google Shopping / MPN',
        'Google Shopping / AdWords Grouping', 'Google Shopping / AdWords Labels',
        'Google Shopping / Condition', 'Google Shopping / Custom Product',
        'Google Shopping / Custom Label 0', 'Google Shopping / Custom Label 1',
        'Google Shopping / Custom Label 2', 'Google Shopping / Custom Label 3',
        'Google Shopping / Custom Label 4', 'Variant Image', 'Variant Weight Unit',
        'Variant Tax Code', 'Cost per item', 'Status'
    ]
    
    with open(input_file, 'r', encoding='utf-8-sig') as infile, \
         open(output_file, 'w', newline='', encoding='utf-8') as outfile:
        
        reader = csv.DictReader(infile)
        writer = csv.DictWriter(outfile, fieldnames=shopify_headers)
        writer.writeheader()
        
        for row in reader:
            if row['fieldType'] != 'Product':
                continue
                
            # Extract handle from handleId
            handle = row['handleId'].replace('product_', '').replace('-', '_')
            
            # Process images with full Wix URLs
            raw_images = row['productImageUrl'].split(';') if row['productImageUrl'] else []
            images = [f"https://static.wixstatic.com/media/{img.strip()}" for img in raw_images if img.strip()]
            
            # Process tags and category
            tags = row['collection'].replace(';', ',') if row['collection'] else ''
            first_tag = row['collection'].split(';')[0] if row['collection'] else ''
            
            # Create main product row
            shopify_row = {
                'Handle': handle,
                'Title': row['name'],
                'Body (HTML)': row['description'],
                'Vendor': row.get('brand', ''),
                'Type': first_tag,
                'Tags': tags,
                'Published': 'TRUE' if row['visible'].lower() == 'true' else 'FALSE',
                'Variant Price': row['price'],
                'Variant Inventory Qty': row['inventory'],
                'Variant Grams': int(float(row['weight']) * 1000) if row['weight'] else '',
                'Variant Inventory Tracker': 'shopify',
                'Variant Inventory Policy': 'deny',
                'Variant Fulfillment Service': 'manual',
                'Variant Requires Shipping': 'TRUE',
                'Variant Taxable': 'TRUE',
                'Cost per item': row['cost'] if row['cost'] else '',
                'Status': 'active',
                'Gift Card': 'FALSE'
            }
            
            # Add first image
            if images:
                shopify_row['Image Src'] = images[0]
                shopify_row['Image Position'] = '1'
                shopify_row['Image Alt Text'] = row['name']
            
            writer.writerow(shopify_row)
            
            # Add additional images
            for i, image in enumerate(images[1:], 2):
                image_row = {
                    'Handle': handle,
                    'Image Src': image,
                    'Image Position': str(i),
                    'Image Alt Text': row['name']
                }
                writer.writerow(image_row)

if __name__ == "__main__":
    convert_wix_to_shopify()
    print("✅ Conversion completed! Check shopify_products.csv")
