# OnlineShop
Full Stack application made in Node.js with Postgres database. The application is an online shop and is used to order, sell and promote various items.
The task was to make an online shop with the specifications below. 
I came up with the idea to make a shop as a shop for antique items and used the imagined theme and edited the css pages based on it.

More detailed specifications

Chief Administrator
Possibility of archiving users (buyers and traders), and the possibility of blocking or blocking for a period of 15 days; This option works through the GUI, like everything else.
Statistical module, showing the number of all users, the number of customers, shops, items, the number of orders with all items and present them in tabular and graphical form (graph);
CRUD for all lookup tables (types of stores, items, etc.).

Merchant
Possibility of registration and login to the system;
Ability to enter and edit trade data;
Possibility of CRUD operations with individual items; It is useful to enter keywords / tags for items
(eg if a Real Madrid jersey is sold, the keywords are football, jersey).
Possibility of editing the catalog of the store (items and profiles);
Notifications for each order containing the merchant's item;
Possibility of approving / rejecting an order after the customer creates it;
Checking and recording orders. List of all orders with their status;
Possibility to change the status (supplied).

Buyer
Possibility to log in and register on the system;
When registering, the user's name, surname and e-mail must be entered;
Enter a number of interests (services / products / product types) for the specified user; This string is entered during registration.
Cover page with three groups of items (most popular, randomly selected and recommended for the customer based on his interests);
Ability to search for items, shops, types of items and more;
Review of an individual item or store profile;
Ability to create orders (ie add items to the cart and confirm the order);
After creating the order, an e-mail is sent to the customer that the order was successfully sent, and the customer receives an e-mail when changing the status of the order;
The customer has the ability to check the list of all their orders with their status, has the ability to cancel the order (if it is not delivered),
but does not have the ability to edit the content.

Additional requirements
Merchant service evaluation. The buyer can leave a rating for each item. The popularity of an item depends on the average rating, as well as on the total number of orders of that item;
Sorting and filtering items / services on the trader's profile, as well as on the front page;
Three original additional specifications to be devised by the student.
