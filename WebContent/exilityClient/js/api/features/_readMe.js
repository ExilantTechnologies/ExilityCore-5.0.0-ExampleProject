/**
 * INTRODUCTION
 * 
 * Brief note on the design of Exility client side engine. This note should not
 * be confused as "justification" for the design. Its intent is to help you in
 * understanding how/why we did it that way.
 * 
 * Core design was completed in 2005. Both JavaScript syntax as well as its
 * usage have evolved from almost fully functional to almost fully object
 * oriented. We are, somewhere in-between, and that would be quite confusing in
 * the beginning for you.
 * 
 * We certainly intend to go in for a complete re-write for next version, and
 * provide a transition path for existing projects, rather than a
 * backward-compatible re-factoring. Current version has nothing as "private',
 * and hence every method need be treated as a published API.
 * 
 * HISTORY
 * 
 * Back in 2001 (pre-cursor to Exility), internet became de-facto standard as a
 * communication infrastructure. Browser was used for web sites, and for online
 * commerce. But the ERP type of applications were still debating how to exploit
 * the new infrastructure. Likes JSP, ASP and PHP were popular. And they all
 * treated the browser dumber than an IBM green terminal. They were implementing
 * an MVC architecture, all on the server, treating browser as just a rendering
 * engine, much like an IBM monitor that rendered an allocated memory on to a
 * raster display device. At that time, client-server technology had matured,
 * VisualBasic and PowerBuilder were quite popular client-side technologies. We
 * felt that the industry had reached a cross-road. Do we replace the
 * "thick-and-smart-client" applications built using VB/PB with "dumb-browser"
 * based thin client? Or do we deliver some functionality using thick client,
 * and others using dumb client?
 * 
 * We decided to treat the browser as "intelligent" and use it as a replacement
 * for VB/PB. While the entire world was "submitting the form" to server and
 * refreshing the browser window with a new document that the server returned,
 * we developed a technique to carry out communication just the way VB/PB were
 * making : call the server as if it is an RPC. We figured out that
 * xmlHttpRequest was just the right tool to do that. However, only IE supported
 * it at that time. We designed an alternate technique for other browsers, where
 * we "submitted" a form into an iFrame of the same window. A script that
 * contain data was returned into that window, along with a function that
 * triggered the call back. It simulated xmlHttpRquest exactly the way we
 * wanted.
 * 
 * Later, the industry evolved to use these technique, and coined the term
 * "AJAX" that has become the de-facto standard now. supported by IE, and no
 * other browser at that point. We used made a call that the browser will
 * 
 * Focus of client side engine we initially designed was to just deliver a
 * client-side MVC architecture. We added a few simple features to make the
 * client application more intelligent like immediate validation of fields (on
 * tab out), grid-editing with add-row, repeating columns in grid editing etc..
 * 
 * An important decision that we still stand by, but one that haunts us, is
 * about look-and-feel. We kept the engine clear out of look-and-feel burden,
 * and delegated that to a layer on top. However, we never got to design the
 * skin. We let the projects do that. Unfortunately for us, our first set of
 * customers did not go for great look-and-feel. In fact, most of them lived
 * with poor look-and-feel. With the result, there is a general perception that
 * Exility means poor UI !!!!
 * 
 * However, that decision has payed us rich dividends. The basic design has not
 * changed even today. Applications that used Exility are able to easily exploit
 * the latest in UI : vast set of widgets in the open-source community. It is
 * important to note that while Exility client-side did not help UI, it was
 * designed not to come in the way. Some applications, like Time at Exilant,
 * have state-of-the art UX features, but they use Exility as their MVC engine.
 * 
 * Our first version of engine expected the programmers to add custom attributes
 * in tags for binding html tags to data-elements in the data model.
 * (surprisingly, Angular JS is re-inventing this technique now!!) We quickly
 * realized teh pitfalls, and moved to page.xml design.
 * 
 * CURRENT STATE
 * 
 * While we believe our basic design has withstood the changing paradigms of the
 * web, our coding practices have not. We would love to adapt large part of OO
 * techniques that have evolved in JavaScript coding practice. Specifically, we
 * would love to fully comply Douglas Crockford (javascript.crockford.com)
 * 
 * We used javaScript the way it was mostly used in early 2000 - as just Object
 * Oriented, to organize all data and methods into an object. We did not use the
 * class-model with private and public attributes. That has allowed programmers
 * to use any of the internal methods, there by making any re-factoring
 * error-prone.
 * 
 * Delegation of functionality has not be done very well in the current design.
 * We made several quick-and-dirty decisions and did not replace them with
 * elegant designs in time.
 * 
 * In essence, while the current code delivers a good functionality, it is quite
 * difficult to maintain, and any maintenance activity has to be done with good
 * care, and thorough review and testing.
 * 
 * CHART INTEGRATION
 * 
 * We used flotr, and integrated that into our engine. This exercise was done in
 * a hurry, and lived that way for few years. We added new features, and
 * continued to use it, though the library was dumped by the original owner.
 * 
 * In 2014, we started re-factoring charting with a driver concept. Concept has
 * come-up well. We are yet to see demand from projects to provide more feature.
 * 
 * CONVENTIONS (some or good, some are bad and some are quite ugly)
 * 
 * 1. We follow the same class hierarchy that you can find on the server. That
 * way it is easy for you to understand them though client-side has not good
 * tool to navigate through the hierarchy
 * 
 * 2. We DO NOT declare all attributes of the class that we use. Reference
 * manual is the right place to understand the meaning of attributes. We do not
 * explain that again here. Several attributes have been added as internal
 * (private) for implementing some features. We intend to make a list of these
 * and document them. Let us see how we act on our intentions :-)
 * 
 * 3. We have organized classes into meaningful files. However, we made some
 * effort to separate methods by aspects, specifically advance features, and
 * split the same class inot more than one files. (table.js and tablexxxxx.js )
 * However, one should note that this separation is not clear and correct. Some
 * aspects of the advanced features are also found in the basic version.
 * However, the basic version will work properly on its own, so long as the
 * advanced features are not used.
 * 
 * 4. Most features that a programmers needs to use have been exposed through
 * page (that is P2 for the programmer).
 * 
 * 5. Programmers use of table is a disaster. We had not exposed proper API's
 * and allowed them to hard-code almost all internal data-structure of table. In
 * other words, it is a mess out there. "currentRow" concept is quite brittle,
 * and susceptible to undesired side effects that lead to bugs that are
 * difficult to trace.
 * 
 * 6. Field is quite stable. AssistedInputField is our new ambition, but is in
 * its infancy.
 * 
 * 7. Remember, we started page generator in 2005. We had to live with browsers
 * that were warring each others. Some of of the applications even took shelter
 * under "IE ONLY" restriction, as almost 85% used IE. Our HTML features still
 * have hang-over from that era.
 * 
 * 8. We started a complete revamp of View aspect with pageType="css". However,
 * we were still not strict in the beginning. We intend to move towards a strict
 * mode where HTML document provides the DOM structure, with absolutely no view
 * attributes. CSS would be used for all view features. JavaScipt would not
 * change views, but would set custom-attributes.
 * 
 * 
 * PEEK TO THE FUTURE
 * 
 * We recommend that the client engine be forked and completely re-written for
 * future use. This new version should not be burdened with backward
 * compatibility. However, it should allow co-living, so that existing
 * applications can switch-over over a period of time, across several releases
 * over the years rather than forcing a big-bang.
 * 
 * 
 */
