'use strict';

const Hapi = require('hapi');
const fs = require("fs");
const uuidv4 = require('uuid/v4');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.connect('mongodb://localhost/test');


const Book = new Schema({
    title:  String,
    author: String,
    date: { type: Date, default: Date.now },
    categories: { type: Schema.Types.ObjectId, ref: 'Category' }
  });

const Category = new Schema({
    title:  String,
    books: [{ type: Schema.Types.ObjectId, ref: 'Books' }],
    test: {
      book: [{ type: Schema.Types.ObjectId, ref: 'Books' }]
    }
  });

const Books = mongoose.model('Books', Book);
const Categories = mongoose.model('Category', Category);

//Add books
// const Book = new Books({ name: 'test book' });
// Book.save().then((s) => console.log('save books',s));

const server = new Hapi.Server();

server.connection({ port: 3000, host: 'localhost' });

server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        reply('Hello, world!');
    }
});


// Add the route
server.route({
    method: 'GET',
    path:'/books',
    handler: function (request, reply) {
      Books.findById(request.params.id)
      .populate({ path: 'categories', select: 'title -_id' })
      .exec(function (err, book) {
        if (err) return console.error(err);
        return reply(book);
      })

    }
});

// Add Books name
server.route({
    method: 'POST',
    path:'/books',
    handler: function (request, reply) {

      Categories.findById(request.payload.categories,function (err, Category) {
        if (err) return console.error(err);
        if(Category){
          const Book = new Books({
            title:  request.payload.title,
            author: request.payload.author,
            categories: Category._id
          });
          Book.save().then((sbook) => {
            console.log('save Book:',sbook)
            Category.books.push(sbook._id);
            Category.test = { book:[]};
            Category.test.book.push(sbook._id);
            Category.save().then((s) => {
              console.log('save Category:',s)
              return reply(sbook);
            });
          });
          Category.save()
        }else{
          return reply('Category not fount').code(404)
        }
        // return reply(Category);


      })


    }
});


// GET Books by id
server.route({
    method: 'GET',
    path:'/books/{id}',
    handler: function (request, reply) {
      Books.findById(request.params.id)
      .populate({ path: 'categories', select: 'title -_id' })
      .exec(function (err, book) {
        if (err) return console.error(err);
        return reply(book);
      })
    }
});

// update Books by id
server.route({
    method: 'PATCH',
    path:'/books/{id}',
    handler: function (request, reply) {
      Books.findById(request.params.id, function (err, book) {
        if (err) return console.error(err);
        book.name = request.payload.name ;
        book.save().then((s) => {
          console.log('update :',s)
          return reply(s);
        });
      })
    }
});

// delete Books by id
server.route({
    method: 'DELETE',
    path:'/books/{id}',
    handler: function (request, reply) {
      Books.findByIdAndRemove(request.params.id, function (err, book) {
        if (err) return console.error(err);
        console.log('delete :',book)
        return reply(book);
      })
    }
});

// List Category
server.route({
    method: 'GET',
    path:'/Categories',
    handler: function (request, reply) {
      Categories.find(function (err, Category) {
        if (err) return console.error(err);
        return reply(Category);
      })

    }
});

// List Books by Category
server.route({
    method: 'GET',
    path:'/Categories/{id}',
    handler: function (request, reply) {
      Categories.findById(request.params.id)
      .populate({ path: 'test.book', select: '_id title author date' })
      .populate({ path: 'books', select: '_id title author date' })
      .exec(function (err, Category) {
        if (err) return console.error(err);
        return reply(Category);
      });

    }
});

// Add Category
server.route({
    method: 'POST',
    path:'/Categories',
    handler: function (request, reply) {
      const Category = new Categories({ title: request.payload.title });
      Category.save().then((s) => {
        console.log('save :',s)
        return reply(s);
      });
    }
});



// GET Books by arry id
server.route({
    method: 'POST',
    path:'/books/many',
    handler: function (request, reply) {
      const objid = [];
      request.payload.book.forEach((b) => {
          objid.push(mongoose.Types.ObjectId(b));
      })
      Books.find({"_id":objid})
      .populate({ path: 'categories', select: 'title -_id' })
      .exec(function (err, book) {
        if (err) return console.error(err);
        return reply(book);
      })
    }
});

server.route({
    method: 'POST',
    path: '/api/uploadfiles',
    config: {
          payload: {
              output: "stream",
              parse: true,
              allow: "multipart/form-data",
              maxBytes: 2 * 1000 * 1000
          }
      },
      handler: (request, reply) => {
          var result = [];
          console.log(request.payload["file"].length)
          if(request.payload["file"].length>0){
            for(var i = 0; i < request.payload["file"].length; i++) {
                const newfile = uuidv4()+".png";
                result.push({filename:newfile});
                request.payload["file"][i].pipe(fs.createWriteStream(__dirname + "/uploads/" + newfile ))
            }
          }else{
            const newfile = uuidv4()+".png";
            result = {filename:newfile};
            request.payload["file"].pipe(fs.createWriteStream(__dirname + "/uploads/" + newfile ))
          }
            reply(result);
      }
});


server.start((err) => {

    if (err) {
        throw err;
    }
    console.log(`Server running at: ${server.info.uri}`);
});
