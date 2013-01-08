/*!
 * VisualEditor data model Node class.
 *
 * @copyright 2011-2012 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Generic DataModel node.
 *
 * @abstract
 * @extends ve.Node
 * @constructor
 * @param {string} type Symbolic name of node type
 * @param {number} [length] Length of content data in document
 * @param {Object} [element] Reference to element in linear model
 */
ve.dm.Node = function VeDmNode( type, length, element ) {
	// Parent constructor
	ve.Node.call( this, type );

	// Properties
	this.length = length || 0;
	this.element = element;
	this.doc = undefined;
};

/**
 * @event lengthChange
 * @param diff
 */

/**
 * @event update
 */

/* Inheritance */

ve.inheritClass( ve.dm.Node, ve.Node );

/* Methods */

/**
 * Gets a list of allowed child node types.
 *
 * @method
 * @returns {string[]|null} List of node types allowed as children or null if any type is allowed
 */
ve.dm.Node.prototype.getChildNodeTypes = function () {
	return ve.dm.nodeFactory.getChildNodeTypes( this.type );
};

/**
 * Gets a list of allowed parent node types.
 *
 * @method
 * @returns {string[]|null} List of node types allowed as parents or null if any type is allowed
 */
ve.dm.Node.prototype.getParentNodeTypes = function () {
	return ve.dm.nodeFactory.getParentNodeTypes( this.type );
};

/**
 * Checks if this node can have child nodes.
 *
 * @method
 * @returns {boolean} Node can have children
 */
ve.dm.Node.prototype.canHaveChildren = function () {
	return ve.dm.nodeFactory.canNodeHaveChildren( this.type );
};

/**
 * Checks if this node can have child nodes which can also have child nodes.
 *
 * @method
 * @returns {boolean} Node can have grandchildren
 */
ve.dm.Node.prototype.canHaveGrandchildren = function () {
	return ve.dm.nodeFactory.canNodeHaveGrandchildren( this.type );
};

/**
 * Checks if this node represents a wrapped element in the linear model.
 *
 * @method
 * @returns {boolean} Node represents a wrapped element
 */
ve.dm.Node.prototype.isWrapped = function () {
	return ve.dm.nodeFactory.isNodeWrapped( this.type );
};

/**
 * Checks if this node can contain content.
 *
 * @method
 * @returns {boolean} Node can contain content
 */
ve.dm.Node.prototype.canContainContent = function () {
	return ve.dm.nodeFactory.canNodeContainContent( this.type );
};

/**
 * Checks if this node is content.
 *
 * @method
 * @returns {boolean} Node is content
 */
ve.dm.Node.prototype.isContent = function () {
	return ve.dm.nodeFactory.isNodeContent( this.type );
};

/**
 * Checks if this node has significant whitespace. Can only be true if canContainContent is
 * also true.
 *
 * @method
 * @returns {boolean} Node has significant whitespace
 */
ve.dm.Node.prototype.hasSignificantWhitespace = function () {
	return ve.dm.nodeFactory.doesNodeHaveSignificantWhitespace( this.type );
};

/**
 * Checks if this node has an ancestor with given type and attributes.
 *
 * @method
 * @returns {boolean} Node is content
 */
ve.dm.Node.prototype.hasMatchingAncestor = function ( type, attributes ) {
	var key,
		node = this;
	// Traverse up to matching node
	while ( node && node.getType() !== type ) {
		node = node.getParent();
		// Stop at root
		if ( node === null ) {
			return false;
		}
	}
	// Check attributes
	if ( attributes ) {
		for ( key in attributes ) {
			if ( node.getAttribute( key ) !== attributes[key] ) {
				return false;
			}
		}
	}
	return true;
};

/**
 * Gets the inner length.
 *
 * @method
 * @returns {number} Length of the node's contents
 */
ve.dm.Node.prototype.getLength = function () {
	return this.length;
};

/**
 * Gets the outer length, including any opening/closing elements.
 *
 * @method
 * @returns {number} Length of the entire node
 */
ve.dm.Node.prototype.getOuterLength = function () {
	return this.length + ( this.isWrapped() ? 2 : 0 );
};

/**
 * Gets the range inside the node.
 *
 * @method
 * @returns {ve.Range} Inner node range
 */
ve.dm.Node.prototype.getRange = function () {
	var offset = this.getOffset();
	if ( this.isWrapped() ) {
		offset++;
	}
	return new ve.Range( offset, offset + this.length );
};

/**
 * Gets the range outside the node.
 *
 * @method
 * @returns {ve.Range} Outer node range
 */
ve.dm.Node.prototype.getOuterRange = function () {
	var offset = this.getOffset();
	return new ve.Range( offset, offset + this.getOuterLength() );
};

/**
 * Sets the inner length.
 *
 * @method
 * @param {number} length Length of content
 * @throws Invalid content length error if length is less than 0
 * @emits lengthChange
 * @emits update
 */
ve.dm.Node.prototype.setLength = function ( length ) {
	if ( length < 0 ) {
		throw new Error( 'Length cannot be negative' );
	}
	// Compute length adjustment from old length
	var diff = length - this.length;
	// Set new length
	this.length = length;
	// Adjust the parent's length
	if ( this.parent ) {
		this.parent.adjustLength( diff );
	}
	// Emit events
	this.emit( 'lengthChange', diff );
	this.emit( 'update' );
};

/**
 * Adjust the length.
 *
 * @method
 * @param {number} adjustment Amount to adjust length by
 * @throws Invalid adjustment error if resulting length is less than 0
 * @emits lengthChange (diff)
 * @emits update
 */
ve.dm.Node.prototype.adjustLength = function ( adjustment ) {
	this.setLength( this.length + adjustment );
};

/**
 * Gets the offset of this node within the document.
 *
 * If this node has no parent than the result will always be 0.
 *
 * @method
 * @returns {number} Offset of node
 */
ve.dm.Node.prototype.getOffset = function () {
	return this.root === this ? 0 : this.root.getOffsetFromNode( this );
};

/**
 * Gets an element attribute value.
 *
 * Return value is by reference if array or object.
 *
 * @method
 * @returns {Mixed} Value of attribute, or undefined if no such attribute exists
 */
ve.dm.Node.prototype.getAttribute = function ( key ) {
	return this.element && this.element.attributes ? this.element.attributes[key] : undefined;
};

/**
 * Gets a copy of this node's attributes.
 *
 * Values are by reference if array or object, similar to using the getAttribute method.
 *
 * @method
 * @param {string} prefix Only return attributes with this prefix, and remove the prefix from them
 * @returns {Object} Attributes
 */
ve.dm.Node.prototype.getAttributes = function ( prefix ) {
	var key, filtered,
		attributes = this.element && this.element.attributes ? this.element.attributes : {};
	if ( prefix ) {
		filtered = {};
		for ( key in attributes ) {
			if ( key.indexOf( prefix ) === 0 ) {
				filtered[key.substr( prefix.length )] = attributes[key];
			}
		}
		return filtered;
	}
	return ve.extendObject( {}, attributes );
};

/**
 * Checks if this node has certain attributes.
 *
 * If an array of keys is provided only the presence of the attributes will be checked. If an object
 * with keys and values is provided both the presence of the attributes and their values will be
 * checked. Comparison of values is done by casting to strings unless the strict argument is used.
 *
 * @method
 * @param {string[]|Object} attributes Array of keys or object of keys and values
 * @param {boolean} strict Use strict comparison when checking if values match
 * @returns {boolean} Node has attributes
 */
ve.dm.Node.prototype.hasAttributes = function ( attributes, strict ) {
	var key, i, len,
		ourAttributes = this.getAttributes() || {};
	if ( ve.isPlainObject( attributes ) ) {
		// Node must have all the required attributes
		for ( key in attributes ) {
			if (
				!( key in ourAttributes ) ||
				( strict ?
					attributes[key] !== ourAttributes[key] :
					String( attributes[key] ) !== String( ourAttributes[key] )
				)
			) {
				return false;
			}
		}
	} else if ( ve.isArray( attributes ) ) {
		for ( i = 0, len = attributes.length; i < len; i++ ) {
			if ( !( attributes[i] in ourAttributes ) ) {
				return false;
			}
		}
	}
	return true;
};

/**
 * Get a clone of the linear model element for this node. The attributes object is deep-copied.
 *
 * @returns {Object} Cloned element object
 */
ve.dm.Node.prototype.getClonedElement = function () {
	return ve.copyObject( this.element );
};

/**
 * Checks if this node can be merged with another.
 *
 * For two nodes to be mergeable, this node and the given node must either be the same node or:
 *  - Have the same type
 *  - Have the same depth
 *  - Have similar ancestory (each node upstream must have the same type)
 *
 * @method
 * @param {ve.dm.Node} node Node to consider merging with
 * @returns {boolean} Nodes can be merged
 */
ve.dm.Node.prototype.canBeMergedWith = function ( node ) {
	var n1 = this,
		n2 = node;
	// Move up from n1 and n2 simultaneously until we find a common ancestor
	while ( n1 !== n2 ) {
		if (
			// Check if we have reached a root (means there's no common ancestor or unequal depth)
			( n1 === null || n2 === null ) ||
			// Ensure that types match
			n1.getType() !== n2.getType()
		) {
			return false;
		}
		// Move up
		n1 = n1.getParent();
		n2 = n2.getParent();
	}
	return true;
};
