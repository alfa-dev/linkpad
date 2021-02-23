window.migrations = {
  version: 1,

  run: function (db, transaction) {
    if( !db.objectStoreNames.contains("links") ) {
      console.log("Creates Links object store.");
      store_products = db.createObjectStore("links", { keyPath: "generated_at" });
    }
  }
}

window.DB = function () {
  var that = this;

  // This works on all devices/browsers, and uses IndexedDBShim as a final fallback
  that.indexedDB      = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
  that.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
  that.IDBKeyRange    = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

  // Open (or create) the database
  that.open = indexedDB.open("linkPad", migrations.version);

  // Create the schema
  that.open.onupgradeneeded = function(event) {
    migrations.run(that.open.result, event.currentTarget.transaction);
  };

  that.open.onsuccess = function(e) {
    that.db = that.open.result;
    that.ready(e);
  }
}

DB.prototype.ready = function(){};

DB.prototype.put = function(objectStoreName, data, onsuccess, onerror){
  var objectStore = this.getObjectStore([objectStoreName], 'readwrite');

  try {
    objectStoreRequest = objectStore.add(data);

    objectStoreRequest.onsuccess = function(d) {
      if(onsuccess) onsuccess(d);
    }

  } catch(e) {
    onerror(e);
  }
};

DB.prototype.get = function(objectStoreName, key, onsuccess, onerror){
  var objectStore        = this.getObjectStore([objectStoreName], 'readonly');
  var objectStoreRequest = objectStore.openCursor(key);

  objectStoreRequest.onsuccess = function(data) {
    var result = data.target.result ? data.target.result.value : null;

    if(onsuccess) onsuccess(data.target.result);
  }
};

DB.prototype.updateOrCreate = function(objectStoreName, key, updatedData, onsuccess, onerror){
  var self = this;
  var onsuccess = onsuccess || function(){};
  var onerror =  onerror || function(){};

  var objectStore        = this.getObjectStore([objectStoreName], 'readwrite');
  var objectStoreRequest = objectStore.openCursor(key);

  objectStoreRequest.onsuccess = function(data) {
    var cursor = data.target.result;

    if(cursor) {
      var request = data.target.result.update(updatedData);

      request.onsuccess = function() { onsuccess(); }
    } else {
      self.put(objectStoreName, updatedData, onsuccess, onerror);
    }
  }
};

DB.prototype.getAll = function(objectStoreName, onsuccess, onerror ){
  var objectStore = this.getObjectStore([objectStoreName], 'readonly');

  if ('getAll' in objectStore) {
    objectStore.getAll().onsuccess = function(data) {
      var result = data.target.result.length > 0 ? data.target.result : [];
      if(onsuccess) onsuccess(result);
    };
  } else {
    var result = [];
    objectStore.openCursor().onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor) {
        result.push(cursor.value);
        cursor.continue();
      } else {
        if(onsuccess) onsuccess(result);
      }
    };
  }
};

DB.prototype.clear = function(objectStoreName, onsuccess, onerror){
  var objectStore = this.getObjectStore([objectStoreName], 'readwrite');

  try {
    objectStoreRequest = objectStore.clear();

    objectStoreRequest.onsuccess = function() {
      if(onsuccess) onsuccess();
    }

  } catch(e) {
    if(onerror) onerror(e);
  }
};

DB.prototype.getObjectStore = function(store_name, mode) {
  var tx = this.db.transaction(store_name, mode);

  tx.oncomplete = function() {
    this.db.close();
  }

  return tx.objectStore(store_name);
}
