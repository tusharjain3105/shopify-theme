#!/usr/bin/env python3
import csv

def verify_migration():
    print("🔍 MIGRATION VERIFICATION REPORT")
    print("=" * 50)
    
    # Read Wix file
    wix_products = []
    with open('catalog_products.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['fieldType'] == 'Product':
                wix_products.append(row)
    
    # Read Shopify file
    shopify_rows = []
    with open('shopify_products.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        shopify_rows = list(reader)
    
    # Get unique Shopify products (rows with titles)
    shopify_products = [row for row in shopify_rows if row['Title']]
    
    print(f"📊 RECORD COUNT:")
    print(f"   Wix Products: {len(wix_products)}")
    print(f"   Shopify Total Rows: {len(shopify_rows)}")
    print(f"   Shopify Product Rows: {len(shopify_products)}")
    
    print(f"\n✅ FIELD MAPPING VERIFICATION:")
    
    # Check titles
    wix_titles = {p['name'] for p in wix_products if p['name']}
    shopify_titles = {p['Title'] for p in shopify_products if p['Title']}
    title_matches = len(wix_titles.intersection(shopify_titles))
    title_percentage = (title_matches / len(wix_titles)) * 100 if wix_titles else 0
    
    # Check prices
    wix_prices = {p['price'] for p in wix_products if p['price']}
    shopify_prices = {p['Variant Price'] for p in shopify_products if p['Variant Price']}
    price_matches = len(wix_prices.intersection(shopify_prices))
    price_percentage = (price_matches / len(wix_prices)) * 100 if wix_prices else 0
    
    # Check inventory
    wix_inventory = {p['inventory'] for p in wix_products if p['inventory']}
    shopify_inventory = {p['Variant Inventory Qty'] for p in shopify_products if p['Variant Inventory Qty']}
    inventory_matches = len(wix_inventory.intersection(shopify_inventory))
    inventory_percentage = (inventory_matches / len(wix_inventory)) * 100 if wix_inventory else 0
    
    checks = [
        ('Titles', title_percentage),
        ('Prices', price_percentage),
        ('Inventory', inventory_percentage)
    ]
    
    for field, percentage in checks:
        status = "✅" if percentage >= 95 else "⚠️" if percentage >= 80 else "❌"
        print(f"   {status} {field}: {percentage:.1f}% match")
    
    print(f"\n📸 IMAGE VERIFICATION:")
    wix_with_images = len([p for p in wix_products if p['productImageUrl']])
    shopify_with_images = len([r for r in shopify_rows if r['Image Src']])
    print(f"   Wix products with images: {wix_with_images}")
    print(f"   Shopify rows with images: {shopify_with_images}")
    
    print(f"\n🏷️ SAMPLE PRODUCT COMPARISON:")
    if wix_products:
        sample_wix = wix_products[0]
        sample_shopify = next((p for p in shopify_products if p['Title'] == sample_wix['name']), None)
        
        if sample_shopify:
            print(f"   Product: {sample_wix['name']}")
            print(f"   Wix Price: ${sample_wix['price']} → Shopify Price: ${sample_shopify['Variant Price']}")
            print(f"   Wix Inventory: {sample_wix['inventory']} → Shopify Inventory: {sample_shopify['Variant Inventory Qty']}")
            print(f"   Wix Collection: {sample_wix['collection']} → Shopify Type: {sample_shopify['Type']}")
    
    # Overall score
    avg_score = sum([check[1] for check in checks]) / len(checks)
    if avg_score >= 95:
        print(f"\n🎉 MIGRATION STATUS: EXCELLENT ({avg_score:.1f}%)")
    elif avg_score >= 80:
        print(f"\n⚠️ MIGRATION STATUS: GOOD ({avg_score:.1f}%) - Minor issues")
    else:
        print(f"\n❌ MIGRATION STATUS: NEEDS REVIEW ({avg_score:.1f}%)")
    
    print(f"\n📋 NEXT STEPS:")
    print(f"   1. Review shopify_products.csv in Excel/Google Sheets")
    print(f"   2. Test import in Shopify admin (Products → Import)")
    print(f"   3. Verify product images load correctly")
    print(f"   4. Check product descriptions formatting")

if __name__ == "__main__":
    verify_migration()
