# Advanced Markdown + HTML Test

## HTML Elements in Markdown

### Basic HTML Tags

This paragraph includes <em>emphasized text</em>, <strong>strong text</strong>, and <code>inline code</code>.

<div style="background-color: #f0f0f0; padding: 1em; border-radius: 4px;">
  This is a div with custom styling.
  
  It contains **markdown** inside HTML.
</div>

### HTML Tables with Complex Layout

<table>
  <thead>
    <tr>
      <th rowspan="2">Dataset</th>
      <th colspan="3">Metrics</th>
    </tr>
    <tr>
      <th>Precision</th>
      <th>Recall</th>
      <th>F1</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Test A</td>
      <td>0.95</td>
      <td>0.92</td>
      <td>0.93</td>
    </tr>
    <tr>
      <td>Test B</td>
      <td>0.88</td>
      <td>0.85</td>
      <td>0.86</td>
    </tr>
  </tbody>
</table>

### Mixed Content

<div class="info-box">
  <h4>Important Note</h4>
  
  This box contains:
  - Markdown lists
  - **Bold text**
  - `code snippets`
  
  > And even blockquotes!
</div>

### HTML Details/Summary

<details>
<summary>Click to expand technical details</summary>

```python
def complex_function():
    """This is inside an HTML details element"""
    return "But still syntax highlighted!"
```

1. Nested markdown
2. Works perfectly
3. In the details

</details>

### Custom HTML Components

<div class="alert alert-warning">
  <h4>⚠️ Warning</h4>
  <p>This is a custom alert component with an emoji.</p>
</div>

<div class="card">
  <img src="https://via.placeholder.com/150" alt="Placeholder">
  <div class="card-body">
    <h5>Card Title</h5>
    <p>Cards can contain *markdown* and <code>HTML</code>.</p>
  </div>
</div>

### HTML Definition Lists

<dl>
  <dt>Markdown</dt>
  <dd>A lightweight markup language with plain text formatting syntax.</dd>
  
  <dt>HTML</dt>
  <dd>The standard markup language for documents designed to be displayed in a web browser.</dd>
</dl>

### Subscripts and Superscripts

Chemical formula: H<sub>2</sub>O

Mathematical expression: E = mc<sup>2</sup>

### Custom Layout

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1em;">
  <div>
    ### Left Column
    Content in the left column with *markdown*.
  </div>
  <div>
    ### Right Column
    Content in the right column with *markdown*.
  </div>
</div>

### Interactive Elements

<button onclick="alert('Note: This might not work due to security restrictions')">
  Click me!
</button>

<input type="text" placeholder="This is just a demonstration">

### Accessibility Features

<figure role="figure" aria-label="Example figure">
  <img src="https://via.placeholder.com/300" alt="Example image">
  <figcaption>This is a figure with proper ARIA attributes</figcaption>
</figure>

### SVG in HTML

<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
</svg>

## Testing Edge Cases

### Empty HTML Elements

<div></div>

### Nested HTML in Markdown Lists

1. First item
   <div style="margin-left: 20px">
     Nested content in a list
   </div>
2. Second item
   <details>
   <summary>Nested details in list</summary>
   
   - Sub list
   - With markdown
   
   </details>

### HTML Comments

<!-- This is an HTML comment -->

Normal markdown continues here.

### Special Characters in HTML

<div title="Quote: &quot;Test&quot;">
  HTML with &amp; special &lt;characters&gt;
</div>

---

This file tests the interaction between HTML and Markdown, including:
1. Complex HTML structures
2. Mixed content rendering
3. Edge cases and special characters
4. Interactive elements
5. Accessibility features 