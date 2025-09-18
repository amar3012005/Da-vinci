import React, { useState } from "react";

const ContactForm = ({ receiverEmail, orderDetails }) => {
    const [status, setStatus] = useState("Next");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus("Sending...");
        const { name, email, message } = e.target.elements;
        let details = {
            name: name.value,
            email: email.value,
            message: message.value,
            receiverEmail: receiverEmail, // Use the provided receiverEmail prop
            orderDetails: orderDetails, // Include order details
        };
        let response = await fetch("http://localhost:5000/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json;charset=utf-8" },
            body: JSON.stringify(details),
        });
        setStatus("Next");
        let result = await response.json();
        alert(result.status);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label htmlFor="name">Name:</label>
                <input type="text" id="name" required />
            </div>
            <div>
                <label htmlFor="email">Email:</label>
                <input type="email" id="email" required />
            </div>
            <div>
                <label htmlFor="message">Message:</label>
                <textarea id="message" required />
            </div>
            <button type="submit">{status}</button>
        </form>
    );
};

export default ContactForm;
