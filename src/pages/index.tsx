import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import Image from "next/image";
import reactLogo from "../assets/react.svg";
import tauriLogo from "../assets/tauri.svg";
import nextLogo from "../assets/next.svg";
import * as _ from 'lodash';
import { BaseDirectory, copyFile, readBinaryFile } from '@tauri-apps/api/fs';
import { open, save } from '@tauri-apps/api/dialog';
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';

class Book {
  id: number;
  title: string;
  author: string;
}

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [books, setBooks] = useState<Book[]>([]);

  const books_list = books.map((book) =>
    <li key={book.id}>{book.title} -- {book.author}</li>
  );

  async function getBooks() {
    setBooks(JSON.parse(await invoke<string>("books_list")));
  }

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke("greet", { name }));
  }

  async function test() {
    const selected = await open({
      multiple: true,
      filters: [{
        name: 'Document',
        extensions: ['pdf', 'epub']
      }]
    });
    const content = await readBinaryFile(selected[0]);
    const extension = typeof selected[0] === 'string' ? selected[0].split('.').pop() : 'pdf';
    const doc = await pdfjs.getDocument(content).promise;
    const metaData = await doc.getMetadata();
    console.log(doc, selected, metaData);
    await invoke('books_create', { title: metaData.info.Title, author: metaData.info.Author });

    await copyFile(selected[0], `${metaData.info.Title} -- ${metaData.info.Author}.${extension}`, { dir: BaseDirectory.AppConfig });
    await getBooks();
  }

  getBooks()

  return (
    <div className="container">
      <h1>Welcome to Tauri!</h1>

      <div className="row">
        <span className="logos">
          <a href="https://nextjs.org" target="_blank">
            <Image
              width={144}
              height={144}
              src={nextLogo}
              className="logo next"
              alt="Next logo"
            />
          </a>
        </span>
        <span className="logos">
          <a href="https://tauri.app" target="_blank">
            <Image
              width={144}
              height={144}
              src={tauriLogo}
              className="logo tauri"
              alt="Tauri logo"
            />
          </a>
        </span>
        <span className="logos">
          <a href="https://reactjs.org" target="_blank">
            <Image
              width={144}
              height={144}
              src={reactLogo}
              className="logo react"
              alt="React logo"
            />
          </a>
        </span>
      </div>

      <p>Click on the Tauri, Next, and React logos to learn more.</p>
      {books_list}

      <div className="row">
        <div>
          <input
            id="greet-input"
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Enter a name..."
          />
          <button type="button" onClick={() => greet()}>
            Greet
          </button>

          <button type="button" onClick={() => test()}>
            Test Button
          </button>
        </div>
      </div>

      <p>{greetMsg}</p>
    </div>
  );
}

export default App;
function createDir(arg0: string, arg1: { dir: BaseDirectory; recursive: boolean; }) {
  throw new Error("Function not implemented.");
}

