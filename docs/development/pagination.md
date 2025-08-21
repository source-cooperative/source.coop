# Simple Cursor-Based Pagination

A minimal pagination system using DynamoDB cursors for optimal performance.

## Why Cursors Are Necessary

For DynamoDB, cursor-based pagination is the **only efficient approach**:

- **Page-based pagination**: Requires scanning from the beginning for each page (O(n²) complexity)
- **Cursor-based pagination**: Single query per page (O(1) complexity)
- **Performance difference**: Cursors are 10-100x faster for large datasets

## How It Works

- **Next**: Uses DynamoDB's `LastEvaluatedKey` to fetch the next page efficiently
- **Previous**: Simple navigation - either to specific previous page or back to first page
- **No page numbers**: Just Previous/Next buttons
- **Simple tracking**: Current cursor becomes previous cursor for next page
- **Proper links**: Uses Next.js Link components for accessibility and SEO

## Usage

```tsx
// Fetch data efficiently
const result = await getPaginatedProducts(limit, cursor, previousCursor);

// Render
<ProductsList 
  products={result.products}
  pagination={{
    hasNextPage: result.hasNextPage,
    hasPreviousPage: result.hasPreviousPage,
    nextCursor: result.nextCursor,
    previousCursor: result.previousCursor,
    currentCursor: cursor
  }}
/>
```

## URL Structure

- First page: `/`
- Next pages: `/?cursor=nextCursor&previous=currentCursor`
- Previous pages: `/?cursor=previousCursor` or `/` (back to first page)

## Navigation Logic

- **Next button**: Links to `/?cursor=${nextCursor}&previous=${currentCursor}`
- **Previous button**: 
  - If `previousCursor` exists: links to `/?cursor=${previousCursor}`
  - If no `previousCursor`: links back to `/` (first page)
- **First page**: Previous button is disabled (no cursor means we're on first page)
- **Last page**: Next button is disabled (no next cursor)

## Benefits of Using Links

- **Accessibility**: Screen readers can navigate pagination
- **SEO**: Search engines can crawl paginated content
- **User experience**: Right-click to open in new tab, bookmark pages
- **Performance**: No JavaScript required for basic navigation
- **Progressive enhancement**: Works even if JavaScript fails

## Performance Benefits

- **Single query per page**: No rescanning from beginning
- **Constant time complexity**: O(1) per page regardless of dataset size
- **Scalable**: Works efficiently with millions of records
- **DynamoDB native**: Uses the database's built-in pagination mechanism

## Components

- **Pagination**: Previous/Next buttons wrapped in Link components
- **ProductsList**: Wraps products with pagination
- **Server Action**: Efficient cursor-based data fetching

That's it! Efficient, scalable, accessible, and SEO-friendly - perfect for DynamoDB.
