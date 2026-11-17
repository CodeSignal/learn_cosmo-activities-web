__Type__

Text Input

__Content__

<form id="cart" style="font: 16px system-ui, sans-serif; padding: 24px 24px 8px">
  <label>Item <input name="item" value="Coffee beans" style="font: inherit; padding: 4px 8px"></label>
  <button style="font: inherit; padding: 4px 12px">Add to cart</button>
</form>
<p id="cart-status" style="font: 600 16px system-ui, sans-serif; padding: 0 24px"></p>
<script>
  const form = document.getElementById('cart');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    document.getElementById('cart-status').textContent = 'In cart: ' + new FormData(form).get('item');
  });
</script>

__Heading__

The side content is inline HTML with a form, like the apps in QA questions. Clicking Add to cart runs the form's submit handler, which writes the line under the form.

__Practice Question__

Click **Add to cart**. Which item does the line under the form show?

__Correct Answers__

- Coffee beans [kind: string] [options: caseSensitive=false]
