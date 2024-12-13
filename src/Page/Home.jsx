import axios from "axios";
import React, { useState } from "react";
import {
  Alert,
  Button,
  Col,
  Form,
  InputGroup,
  Modal,
  Row,
  Spinner
} from "react-bootstrap";
import { FaMagic } from "react-icons/fa";

const Test = () => {
  const OpenAIkey = process.env.REACT_APP_OPENAIKEY;
  const [prompt, setPrompt] = useState("");
  const [optimizedPrompts, setOptimizedPrompts] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);

  // Modal handlers
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  // Handle optimizing the prompt
  const handleOptimizePrompt = async () => {
    if (!prompt.trim()) return;

    setLoadingPrompt(true);
    setError("");

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OpenAIkey}`, // Replace with your OpenAI API key
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: "You are an AI that generates image descriptions.",
              },
              {
                role: "user",
                content: `Enhance this description: ${prompt}`,
              },
            ],
            // max_tokens: 100,
            // temperature: 0.7,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const optimizedPrompt = data.choices[0]?.message?.content?.trim();
      if (optimizedPrompt) {
        setOptimizedPrompts((prev) => [...prev, optimizedPrompt]);
      } else {
        setError("No optimized prompt received from the API.");
      }
    } catch (error) {
      setError("Failed to optimize prompt. Please try again.");
      console.error("Error optimizing prompt:", error);
    } finally {
      setLoadingPrompt(false);
    }
  };

  const cropImage = (imageUrl, cropWidth, cropHeight) => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.crossOrigin = "anonymous"; // Enable cross-origin for remote images
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Set canvas dimensions to the crop size
        canvas.width = cropWidth;
        canvas.height = cropHeight;

        // Calculate cropping start positions from the center
        const startX = Math.max((img.width - cropWidth) / 2, 0); // Ensure it's not negative
        const startY = Math.max((img.height - cropHeight) / 2, 0);

        // Draw the cropped image on the canvas
        ctx.drawImage(
          img,
          startX, // Source X
          startY, // Source Y
          cropWidth, // Source width
          cropHeight, // Source height
          0, // Destination X
          0, // Destination Y
          cropWidth, // Destination width
          cropHeight // Destination height
        );

        // Convert the canvas content to a data URL
        const croppedImage = canvas.toDataURL("image/jpeg");
        resolve(croppedImage);
      };

      img.onerror = (error) => {
        console.error("Error loading image:", error);
        reject(error);
      };

      img.src = imageUrl; // Set the image source to the provided URL
    });
  };

  // Handle generating images
  const generateImage = async () => {
    setOptimizedPrompts([]);
    if (!prompt.trim()) return;

    setLoadingImage(true);
    setError("");
    const customPrompt = `${prompt} oriented image with height between 400px to 450px and width between 1400px to 1450px.`;

    const options = {
      method: "POST",
      url: "https://ai-image-generator3.p.rapidapi.com/generate",
      headers: {
        "x-rapidapi-key": process.env.REACT_APP_RAPID,
        "x-rapidapi-host": "ai-image-generator3.p.rapidapi.com",
        "Content-Type": "application/json",
      },
      data: {
        prompt: customPrompt,
        page: 1,
      },
    };
    try {
      const response = await axios.request(options);

      // Assuming response.data.results contains image URLs
      const images = response.data.results?.images || [];

      // Crop the images from their center
      const croppedImages = await Promise.all(
        images.map(async (url) => {
          return await cropImage(url, 1450, 450); // Crop center with dimensions
        })
      );

      setImageUrls(croppedImages);
    } catch (error) {
      console.error(error);
      setError("Failed to generate images. Please try again.");
    } finally {
      setLoadingImage(false);
    }
  };

  // Handle prompt badge click
  const handlePromptClick = (selectedPrompt) => {
    setPrompt(selectedPrompt);
  };

  return (
    <div className="container mt-4">
      <Button variant="primary" onClick={handleShow}>
        Upload Files
      </Button>

      <Modal show={show} size="lg" onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Prompt Optimizer and Image Generator</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Prompt Input Section */}
            <Form.Group className="mb-3">
              <Form.Label>Prompt</Form.Label>
              <InputGroup className="mb-3">
                <Form.Control
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter Your Prompt"
                  disabled={loadingPrompt || loadingImage}
                />
                <Button
                  variant="outline-secondary"
                  onClick={handleOptimizePrompt}
                  disabled={loadingPrompt || !prompt}
                >
                  {loadingPrompt ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <FaMagic />
                  )}
                </Button>
              </InputGroup>

              {/* Error Message */}
              {error && <Alert variant="danger">{error}</Alert>}

              {/* Display Optimized Prompts */}
              {optimizedPrompts.map((optPrompt, index) => (
                <Button
                  key={index}
                  bg="secondary"
                  className="me-2 mb-2"
                  onClick={() => handlePromptClick(optPrompt)}
                  style={{ cursor: "pointer" }}
                >
                  {optPrompt}
                </Button>
              ))}
            </Form.Group>

            {/* Generate Images Button */}
            <Button
              variant="success"
              onClick={generateImage}
              disabled={loadingImage || !prompt}
              className="mb-3"
            >
              {loadingImage ? (
                <Spinner animation="border" size="sm" />
              ) : (
                "Generate Image"
              )}
            </Button>

            {/* Display Generated Images */}
            <Form.Group>
              <Row>
                {imageUrls.map((url, index) => (
                  <Col key={index} xs={6} md={4} lg={3} className="mb-3">
                    <img
                      src={url}
                      alt={`Generated ${index}`}
                      className="img-fluid rounded"
                    />
                  </Col>
                ))}
              </Row>
              {!imageUrls.length && !loadingImage && (
                <p className="text-muted text-center">
                  No images generated yet. Enter a prompt to get started!
                </p>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Test;
