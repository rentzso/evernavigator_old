package com.rentzso.mongo;
import java.net.UnknownHostException;

import com.mongodb.MongoClient;
import com.mongodb.MongoException;
import com.mongodb.WriteConcern;
import com.mongodb.DB;
import com.mongodb.DBCollection;
import com.mongodb.BasicDBObject;
import com.mongodb.DBObject;
import com.mongodb.DBCursor;
import com.mongodb.ServerAddress;


public class MongoConnection {
	/**
	 * Handy class to interact with MongoDB
	 */
	
	protected MongoClient mongoClient;
	protected DB db;
	
	public MongoConnection(String server, int port, String db) throws UnknownHostException{
		this.mongoClient = new MongoClient( server , port );
		this.db = this.mongoClient.getDB(db);
		
	}
	
	public DBCollection getCollection(String collection){
		return this.db.getCollection(collection);
	}
	
	

}
