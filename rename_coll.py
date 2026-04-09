import chromadb
c = chromadb.PersistentClient('./chroma_store')
colls = [x.name for x in c.list_collections()]
if 'cisco_docs' in colls:
    print("Found cisco_docs")
    if 'rasa_knowledge' in colls:
        empty_rk = c.get_collection('rasa_knowledge')
        if empty_rk.count() == 0:
            c.delete_collection('rasa_knowledge')
            print("Deleted empty rasa_knowledge")
        else:
            print("rasa_knowledge is not empty, can't overwrite!")
    c.get_collection('cisco_docs').modify(name='rasa_knowledge')
    print("Renamed cisco_docs to rasa_knowledge successfully.")
else:
    print("cisco_docs not found!")
