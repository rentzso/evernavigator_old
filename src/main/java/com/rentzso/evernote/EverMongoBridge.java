package com.rentzso.evernote;
import java.util.*;

import com.evernote.edam.error.EDAMNotFoundException;
import com.evernote.edam.error.EDAMSystemException;
import com.evernote.edam.error.EDAMUserException;
import com.evernote.edam.notestore.NoteMetadata;
import com.evernote.thrift.TException;

import com.mongodb.BasicDBObject;
import com.mongodb.DBCollection;

import com.rentzso.mongo.MongoConnection;
import com.rentzso.evernote.EvernoteHandle;

public class EverMongoBridge {
	public DBCollection tagsCollection;
	protected EvernoteHandle handle;
	protected MongoConnection conn;
	protected HashMap<String, List<BasicDBObject>> tagGuidToNotes = new HashMap<String, List<BasicDBObject>>();
	protected int userId;
	/**
	 * MongoConnection conn: class to connect to mongodb
	 * EvernoteHandle handle: class to interact with evernote data
	 * int userId: the unique identifier of the user
	 */
	
	
	public EverMongoBridge(MongoConnection conn, EvernoteHandle handle, int userId) throws EDAMUserException, EDAMSystemException, EDAMNotFoundException, TException{
		this.conn = conn;
		this.handle = handle;
		this.userId = userId;
		
	}

	/**
	 * dumpTagsToCollection
	 * ---------------------
	 * method to Store tags in mongoDB
	 * following this Mongo Schema
	 * 
	 * {
     *   userId: Number,
	 *   tag: String, 
	 *   guid: String, //tag unique identifier
	 *   count: Number, // number of notes for which the tag has been used.
	 *   notes: [{guid: String, title: String}], // list of guids and titles of the notes tagged with this tag
	 *   related: [{tag: String, guid: String, count: Number}] // list of related tags
	 * }
	 *
	 * just the notes are missing ( use the method "dumpNotesToMongo" to store them )
	 */
	public void dumpTagsToCollection(String collectionName) throws EDAMUserException, EDAMSystemException, EDAMNotFoundException, TException{
	
		Map<String, Integer> tagCount;
		String guid;
		BasicDBObject newRecord;
		int count, countSubTag;
		ArrayList relatedTags;
		
		
		
		this.tagsCollection = this.conn.getCollection(collectionName);
		
		boolean insertNotes;
		ArrayList tagRecord = new ArrayList();
		for (String tagName: this.handle.tagToID.keySet() ){
			guid = this.handle.tagToID.get(tagName);
			tagCount = this.handle.getTagsCount(guid);
			if (tagCount != null){
				System.out.println(tagName);
				relatedTags = new ArrayList();
				count = 0;
				for (String guidSubTag: tagCount.keySet()){
					countSubTag = tagCount.get(guidSubTag);
					
					if (guid.equals(guidSubTag)){
						count = countSubTag;
					} else {
						relatedTags.add(new BasicDBObject("tag", handle.idToTag.get(guidSubTag))
						                           .append("guid", guidSubTag)
												   .append("count",countSubTag) );
					}
				}
				this.tagsCollection.update(new BasicDBObject("guid", guid).append("userId", this.userId),
						new BasicDBObject("$set", new BasicDBObject("tag", tagName).append("count", count).append("related",relatedTags)),
						true, false);
			}
			
			
		}
	}

	/**
	 * dumpNotesToMongo
	 * --------------------
	 * This method stores for each tag all the notes
	 * that references it
	 */
	public void dumpNotesToMongo(String tagToNotesCollectionName) throws EDAMUserException, EDAMSystemException, EDAMNotFoundException, TException{
	
		DBCollection tagToNotesCollection = this.conn.getCollection(tagToNotesCollectionName);
		List<NoteMetadata> notes = this.handle.getAllNotes();
		
		
		
		
		List<String> tags;
		String guid;
		String title;
		this.tagGuidToNotes.clear();
		for (NoteMetadata note: notes){
			tags = note.getTagGuids();
			guid = note.getGuid();
			title = note.getTitle();
		
			//this.notesCollection.insert(new BasicDBObject("title", note.getTitle() ).append("tags", tags ).append("guid", guid) );
			if (tags != null){
				for (String guidTag: tags){
					List<BasicDBObject> tagNotes = tagGuidToNotes.get(guidTag);
					if (tagNotes == null){
						tagNotes = new ArrayList();
						tagNotes.add(new BasicDBObject("guid", guid).append("title", title));
						this.tagGuidToNotes.put(guidTag, tagNotes);
					} else {
						tagNotes.add(new BasicDBObject("guid", guid).append("title", title));
					}	
				}
			}
		}
		
		for (String tagGuid: this.tagGuidToNotes.keySet()){
			List<BasicDBObject> tagNotes = this.tagGuidToNotes.get(tagGuid);
			if (tagNotes != null){
				tagToNotesCollection.update(new BasicDBObject("guid", tagGuid), 
						new BasicDBObject("$set", new BasicDBObject("notes", tagNotes)),
						true, false);
			}
		}
	}

}
