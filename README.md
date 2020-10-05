![License](https://img.shields.io/badge/license-GPL-blue.svg)
![Status](https://img.shields.io/badge/status-stable-brightgreen.svg)
[![](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=8RBU2DYK9AT9Q&source=url)

# DBDesigner

##### Table of Contents

1. [Visual Alchemist reloaded](#visual-alchemist-reloaded)
2. [What it is](#what-it-is)
3. [Version 1.0.7](#version-107)
4. [Version 2.3.0](#version-220)
5. [Screenshots](#screenshots)
6. [For users](#for-users)
7. [Liferay Service Builder](#liferay-service-builder)
8. [For developers](#for-developers)
9. [Supported Browsers](#supported-browsers)
10. [License](#license)



## Visual Alchemist reloaded

This is a major rewrite / update of the 4 year old repository from Prahlad Yery.
[Original Repo of Visual Alchemist](https://github.com/prahladyeri/VisualAlchemist)

I basically ripped the code apart into modules and added new functionality as described below.

## What it is

DBDesigner is a visual design tool for Entity Relationship Diagrams (ERD) that can be run by using a webserver and a browser.
Once the tables and their fields are designed the code to create the entities can be generated and executed on the target database system.

## Version 1.0.7

The version number of Prahlads original repo is 1.0.7. Here are the features of that version. Important: I didn't change the code generation stuff. Nor did I add any new code generators. 

- Create tables structures and relationships and represent them as elements on canvas.
- Drag/Drop the elements on canvas.
- Export the canvas as a `json` file.
- Import the canvas from existing `json` file.
- Export the database as `python-sqlalchemy` ORM code.
- Export the database as raw sql code (`mysql` dialect).
- Export the database as raw sql code (`sqlite` dialect).

## Version 2.3.0

I beamed the version number to 2.3.0. because major code reorganization has been done and the following (main) features were added:

- Renaming existing tables and fields.
- Reorder columns
- Editing existing fields.
- Zoom the canvas for a better overview.
- Added Datepicker for selecting Date / DateTime values.
- A scrollable canvas for being able to create lots of tables.
- Creation of composite foreign constraints
- Composite Unique keys
- Cascading Delete
- Auto-Increment
- New Codegenerator: service.xml for Liferay Service Builder

## Screenshots

![Screenshot1](/screens/screen1.png)
![Screenshot2](/screens/screen2.png)
![Screenshot3](/screens/screen3.png)

## For Users

What to download for a minimal installation? 
* Get the "dist" folder
* In the "dist/lib" folder you'll find jQuery, Bootstrap and Popper. (Tested with 3.5.1 / 4.5.0 / 1.16.1-lts). You can replace them with your favorite versions at your own risk.
* All other software (javascript, css and external libs) are bundled in the dbdesigner.js that you'll also find in the "dist" folder.

So the final structure of a minimal installation looks like this:
```
DBDesigner
|__index.html
|__startUp.js
|__dbdesigner.js
|__assets
|__img
|__lib
```  

You'll need a webserver of your choice to run the tool. However, I included a little Javascript "startUp.js" that uses express to get you started quickly.

1. Install node.js (with npm) https://nodejs.org
2. Go to your application root (DBDesigner in the sample above)
   - type `npm install [--save] express`
3. Run the server with `node startUp.js`
4. Navigate your browser to `localhost:3000`

### Liferay Service Builder

Liferay Service Builder supports the generation of Object Relational Mapping (ORM, based on Hibernate) code in Liferay. The generated Entity-XML can be copied into the Liferay service.xml document.
 
## For developers

As this software uses nodejs and webpack you'll have to install these tools. Do you see the "package.json" and the "webpack.config.js"?
If you're familiar with these, you'll have no problem to bundle the distribution after you changed code. 
If not, hmm... it's definitely worth the time to get started with these frameworks.

1. Clone or Fork the Repository
2. Install node.js (with npm) https://nodejs.org
3. Go to the Folder where the package.json resides
   - type `npm install`
5. Change the code as needed
6. Package the distribution with `npm run webpack`
7. Contributions are welcome! Just send a Pull Request :-)

## Supported Browsers

So far I tested with the current versions of Firefox, Chrome and Edge. And I can say that IE 11 definitely does NOT work.

## License

DBDesigner is free and open source, and it always will be. It is licensed under the [GPLv3](https://opensource.org/licenses/GPL-3.0).

André Kreienbring

October, 2020
