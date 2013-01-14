package com.rentzso.evernote;

import java.util.*;
import java.io.*;

import com.evernote.thrift.*;
import com.evernote.thrift.protocol.TBinaryProtocol;
import com.evernote.thrift.transport.THttpClient;
import com.evernote.thrift.transport.TTransportException;
import com.evernote.edam.type.*;
import com.evernote.edam.error.EDAMNotFoundException;
import com.evernote.edam.error.EDAMSystemException;
import com.evernote.edam.error.EDAMUserException;
import com.evernote.edam.notestore.*;

public class EvernoteHandle {
	/**
	 * List of utility to get data from evernote
	 */
	protected NoteStore.Client noteStore;
	protected String accessToken;
	protected HashMap<String, String> tagToID = new HashMap<String, String>();
	protected HashMap<String, String> idToTag = new HashMap<String, String>();
	
	public EvernoteHandle(String accessToken, String noteStoreUrl) throws EDAMUserException, EDAMSystemException, TException{
		// initialize the handle
		// storing the accessToken
		// and the noteStore used 
		// to interact with Evernote
		THttpClient noteStoreTrans = new THttpClient(noteStoreUrl);
        TBinaryProtocol noteStoreProt = new TBinaryProtocol(noteStoreTrans);
		this.noteStore = new NoteStore.Client(noteStoreProt, noteStoreProt);
		this.accessToken = accessToken;
		this.initializeTags();
	}
	
	public List<?> getNotebooks() throws EDAMUserException, EDAMSystemException, TException{
		List<?> notebooks = this.noteStore.listNotebooks(this.accessToken);
		return notebooks;
	}
	
	public List<?> getTags() throws EDAMUserException, EDAMSystemException, TException{
		List<?> tags = this.noteStore.listTags(this.accessToken);
		return tags;
	}
	
	private void initializeTags() throws EDAMUserException, EDAMSystemException, TException{
		/**
		 * utility that initialize the two maps
		 * that convert from guid (unique identifier) to tags
		 * and vice versa
		 */
		int count = 0;
		for (Object tag: this.getTags() ){
			count++;
			String name = ((Tag)tag).getName();
			String guid = ((Tag)tag).getGuid();
			this.tagToID.put(name, guid);
			this.idToTag.put(guid, name);
		}
		System.out.print("TagCount: ");
		System.out.println(count);
	}
	
	public Map<String, Integer> getTagsCount(String guid) throws EDAMUserException, EDAMSystemException, EDAMNotFoundException, TException{
		/**
		 * from an evernote guid
		 * return the number of related notes
		 */
		NoteFilter filter = new NoteFilter();
		filter.addToTagGuids(guid);
		return this.noteStore.findNoteCounts(accessToken, filter, false).getTagCounts();
	}
	
	public List<NoteMetadata> getAllNotes() throws EDAMUserException, EDAMSystemException, EDAMNotFoundException, TException{
		NoteFilter filter = new NoteFilter();
		NotesMetadataResultSpec spec = new NotesMetadataResultSpec();
		spec.setIncludeTagGuids(true);
		spec.setIncludeTitle(true);
		return this.noteStore.findNotesMetadata(accessToken, filter, 0, 400, spec).getNotes();
	}
	
}
