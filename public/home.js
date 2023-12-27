var stripeHandler = StripeCheckout.configure({
    key: stripePublicKey,
    locale: "auto",
    token: function(token) {
        var newInput = document.createElement("input");

        // Set attributes for the new input (e.g., type, id, name)
        newInput.type = "text";
        newInput.name = "tokenID";
        newInput.value = token.id
        // Append the new input element to the form
        document.getElementById("question-form").appendChild(newInput);
        document.getElementById("question-form").submit();
    }
})

function purchaseClicked(){
    price = document.getElementById("price").value * 100
    stripeHandler.open({
        name: 'Your Company Name',
        description: 'Purchase Description',
        amount: price,
        panelLabel: "Pay", // Set panel label to "Pay" or customize as needed
    })
}